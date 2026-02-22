import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type RobotAuthPayload } from "@/lib/auth";
import { handleError } from "@/lib/errors";
import { subscribeToRobot, subscribeToChatGroup } from "@/lib/pubsub";

const HEARTBEAT_INTERVAL_MS = 30_000;

function extractRobotToken(request: NextRequest): string | null {
  return request.headers.get("x-robot-token");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Verify robot is accessing its own stream
    if (auth.robotId !== id) {
      return NextResponse.json(
        {
          error: {
            code: "forbidden",
            message: "Cannot access another robot's stream.",
          },
        },
        { status: 403 }
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
      where: { memberId: auth.robotId, memberType: "robot" },
      include: { group: true },
    });

    const chatGroups = memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      teamId: m.group.teamId,
    }));

    const encoder = new TextEncoder();
    const unsubscribers: Array<() => Promise<void>> = [];
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connected event with robot info and chatgroups
        const connectedData = {
          robotId: auth.robotId,
          robotName: auth.robotName,
          chatGroups,
        };
        controller.enqueue(
          encoder.encode(
            `event: connected\ndata: ${JSON.stringify(connectedData)}\n\n`
          )
        );

        // Subscribe to robot-specific channel (for @mention tasks)
        const unsubscribeRobot = await subscribeToRobot(
          auth.robotId,
          (data: string) => {
            try {
              controller.enqueue(
                encoder.encode(`event: message\ndata: ${data}\n\n`)
              );
            } catch {
              /* stream already closed */
            }
          }
        );
        unsubscribers.push(unsubscribeRobot);

        // Subscribe to all chatgroup channels (for general awareness)
        for (const group of chatGroups) {
          const unsubscribe = await subscribeToChatGroup(
            group.id,
            (data: string) => {
              try {
                controller.enqueue(
                  encoder.encode(`event: message\ndata: ${data}\n\n`)
                );
              } catch {
                /* stream already closed */
              }
            }
          );
          unsubscribers.push(unsubscribe);
        }

        // Send heartbeat every 30 seconds
        heartbeatTimer = setInterval(() => {
          try {
            const heartbeatData = { timestamp: new Date().toISOString() };
            controller.enqueue(
              encoder.encode(
                `event: heartbeat\ndata: ${JSON.stringify(heartbeatData)}\n\n`
              )
            );
          } catch {
            /* stream already closed */
          }
        }, HEARTBEAT_INTERVAL_MS);
      },
      async cancel() {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
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
