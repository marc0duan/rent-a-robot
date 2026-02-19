import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";

// PUT /api/v1/messages/[id] - Edit a message
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            team: { select: { tenantId: true } },
            members: true,
          },
        },
      },
    });

    if (!message || message.group.team.tenantId !== auth.tenantId) {
      throw new ApiError(404, "not_found", "Message not found.");
    }

    // Only the sender can edit
    if (message.senderId !== auth.userId) {
      throw new ApiError(403, "forbidden", "You can only edit your own messages.");
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      throw new ApiError(400, "validation_error", "Message content is required.");
    }

    // Re-parse @mentions
    const mentionPattern = /@(\w+(?:\s\w+)?)/g;
    const mentionNames: string[] = [];
    let match;
    while ((match = mentionPattern.exec(content)) !== null) {
      mentionNames.push(match[1]);
    }

    let mentions: { id: string; name: string; type: string }[] | null = null;

    if (mentionNames.length > 0) {
      const memberIds = message.group.members.map((m) => m.memberId);

      const [mentionedUsers, mentionedRobots] = await Promise.all([
        prisma.user.findMany({
          where: {
            id: { in: memberIds },
            name: { in: mentionNames, mode: "insensitive" },
          },
          select: { id: true, name: true },
        }),
        prisma.robot.findMany({
          where: {
            id: { in: memberIds },
            name: { in: mentionNames, mode: "insensitive" },
          },
          select: { id: true, name: true },
        }),
      ]);

      mentions = [
        ...mentionedUsers.map((u) => ({ id: u.id, name: u.name, type: "human" as const })),
        ...mentionedRobots.map((r) => ({ id: r.id, name: r.name, type: "robot" as const })),
      ];

      if (mentions.length === 0) mentions = null;
    }

    const updated = await prisma.message.update({
      where: { id },
      data: {
        content: content.trim(),
        mentions: mentions ?? undefined,
      },
    });

    return NextResponse.json({ message: updated });
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/v1/messages/[id] - Remove a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            team: { select: { tenantId: true } },
          },
        },
      },
    });

    if (!message || message.group.team.tenantId !== auth.tenantId) {
      throw new ApiError(404, "not_found", "Message not found.");
    }

    // Sender can delete, or admin/owner can delete any
    const canDelete =
      message.senderId === auth.userId ||
      auth.role === "admin" ||
      auth.role === "owner";

    if (!canDelete) {
      throw new ApiError(403, "forbidden", "You do not have permission to delete this message.");
    }

    await prisma.message.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
