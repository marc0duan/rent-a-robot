import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type TenantAuthPayload } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { subscribeToChatGroup } from "@/lib/pubsub";
import { applyRateLimit } from "@/lib/rate-limit";

const KEEPALIVE_INTERVAL_MS = 15_000;

function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const url = new URL(request.url);
  return url.searchParams.get("token");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        {
          error: {
            code: "unauthorized",
            message: "Missing authentication token.",
          },
        },
        { status: 401 }
      );
    }

    let auth: TenantAuthPayload;
    try {
      auth = verifyToken<TenantAuthPayload>(token);
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "unauthorized",
            message: "Invalid or expired token.",
          },
        },
        { status: 401 }
      );
    }

    if (!auth.tenantId) {
      return NextResponse.json(
        {
          error: {
            code: "no_tenant_context",
            message: "Token does not contain tenant context.",
          },
        },
        { status: 403 }
      );
    }

    await applyRateLimit(request, "user", auth.userId);

    const { id } = await params;

    const group = await prisma.chatGroup.findFirst({
      where: { id, team: { tenantId: auth.tenantId } },
      select: { id: true },
    });

    if (!group) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    const membership = await prisma.chatGroupMember.findUnique({
      where: {
        chatGroupId_memberId: { chatGroupId: id, memberId: auth.userId },
      },
    });

    if (!membership) {
      throw new ApiError(
        403,
        "forbidden",
        "You are not a member of this chatgroup."
      );
    }

    const encoder = new TextEncoder();
    let unsubscribe: (() => Promise<void>) | null = null;
    let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(":connected\n\n"));

        unsubscribe = await subscribeToChatGroup(id, (data: string) => {
          try {
            controller.enqueue(
              encoder.encode(`event: message\ndata: ${data}\n\n`)
            );
          } catch {
            /* stream already closed */
          }
        });

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
        if (unsubscribe) await unsubscribe();
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
