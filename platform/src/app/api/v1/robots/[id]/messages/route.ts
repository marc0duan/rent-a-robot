import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type RobotAuthPayload } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/sanitize";
import { publishMessage } from "@/lib/pubsub";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const robotToken = request.headers.get("x-robot-token");
    if (!robotToken) {
      return NextResponse.json(
        {
          error: {
            code: "unauthorized",
            message: "Missing X-Robot-Token header.",
          },
        },
        { status: 401 }
      );
    }

    let auth: RobotAuthPayload;
    try {
      auth = verifyToken<RobotAuthPayload>(robotToken);
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "unauthorized",
            message: "Invalid or expired robot token.",
          },
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (auth.robotId !== id) {
      return NextResponse.json(
        {
          error: {
            code: "forbidden",
            message: "Cannot post messages as another robot.",
          },
        },
        { status: 403 }
      );
    }

    await applyRateLimit(request, "robot", auth.robotId);

    const body = await request.json();
    const { chatGroupId, content } = body;

    if (!chatGroupId || typeof chatGroupId !== "string") {
      throw new ApiError(400, "validation_error", "chatGroupId is required.");
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      throw new ApiError(400, "validation_error", "Message content is required.");
    }

    if (content.length > 10240) {
      throw new ApiError(400, "validation_error", "Message content must not exceed 10KB.");
    }

    const group = await prisma.chatGroup.findFirst({
      where: { id: chatGroupId, team: { tenantId: auth.tenantId } },
    });

    if (!group) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    const membership = await prisma.chatGroupMember.findUnique({
      where: {
        chatGroupId_memberId: { chatGroupId, memberId: auth.robotId },
      },
    });

    if (!membership) {
      throw new ApiError(
        403,
        "forbidden",
        "Robot is not a member of this chatgroup."
      );
    }

    const sanitizedContent = sanitizeString(content);

    const message = await prisma.message.create({
      data: {
        chatGroupId,
        senderId: auth.robotId,
        senderType: "robot",
        content: sanitizedContent,
      },
    });

    publishMessage(chatGroupId, {
      type: "new_message",
      message: {
        ...message,
        sender: { name: auth.robotName, type: "robot" },
      },
    }).catch(() => {});

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
