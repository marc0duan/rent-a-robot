import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type RobotAuthPayload } from "@/lib/auth";
import { handleError } from "@/lib/errors";
import { subscribeToChatGroup } from "@/lib/pubsub";

const KEEPALIVE_INTERVAL_MS = 15_000;

function extractRobotToken(request: NextRequest): string | null {
  return request.headers.get("x-robot-token");
}

export async function GET(request: NextRequest) {
  try {
    const robotToken = extractRobotToken(request);
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

    // Verify robot still exists and is onboarded
    const robot = await prisma.robot.findUnique({
      where: { id: auth.robotId },
    });

    if (!robot || robot.status === "created") {
      return NextResponse.json(
        {
          error: {
            code: "unauthorized",
            message: "Robot token is invalid or revoked.",
          },
        },
        { status: 401 }
      );
    }

    // Get all chat groups the robot is a member of
    const memberships = await prisma.chatGroupMember.findMany({
      where: { memberId: auth.robotId },
      select: { chatGroupId: true },
    });

    const chatGroupIds = memberships.map((m) => m.chatGroupId);

    if (chatGroupIds.length === 0) {
      // Return empty stream if robot has no chat groups
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(":connected\n\n"));
        },
      });
      return new NextResponse(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const encoder = new TextEncoder();
    const unsubscribers: Array<() => Promise<void>> = [];
    let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(":connected\n\n"));

        // Subscribe to all chat groups the robot is in
        for (const chatGroupId of chatGroupIds) {
          const unsubscribe = await subscribeToChatGroup(chatGroupId, (data: string) => {
            try {
              // Forward all messages to robot - let the robot filter
              controller.enqueue(
                encoder.encode(`event: message\ndata: ${data}\n\n`)
              );
            } catch {
              /* stream already closed */
            }
          });
          unsubscribers.push(unsubscribe);
        }

        keepaliveTimer = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(":keepalive\n\n"));
          } catch {
            /* stream already closed */
          }
        }, KEEPALIVE_INTERVAL_MS);
      },
      async cancel() {
        if (keepaliveTimer) clearInterval(keepaliveTimer);
        for (const unsubscribe of unsubscribers) {
          await unsubscribe();
        }
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
