import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { publishMessage, publishToRobot } from "@/lib/pubsub";
import { applyRateLimit } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/sanitize";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id } = await params;

    // Verify chatgroup belongs to tenant
    const group = await prisma.chatGroup.findFirst({
      where: { id, team: { tenantId: auth.tenantId } },
      select: { id: true },
    });

    if (!group) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    // Verify membership
    const membership = await prisma.chatGroupMember.findUnique({
      where: { chatGroupId_memberId: { chatGroupId: id, memberId: auth.userId } },
    });

    if (!membership) {
      throw new ApiError(403, "forbidden", "You are not a member of this chatgroup.");
    }

    // Parse pagination params
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam ?? "50", 10) || 50, 1), 100);

    const messages = await prisma.message.findMany({
      where: { chatGroupId: id },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    let nextCursor: string | null = null;
    if (messages.length > limit) {
      const next = messages.pop();
      nextCursor = next?.id ?? null;
    }

    // Enrich with sender info
    const senderIds = [...new Set(messages.map((m) => m.senderId))];

    const [users, robots] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, name: true },
      }),
      prisma.robot.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, name: true },
      }),
    ]);

    const senderMap = new Map<string, { name: string; type: string }>();
    for (const u of users) senderMap.set(u.id, { name: u.name, type: "human" });
    for (const r of robots) senderMap.set(r.id, { name: r.name, type: "robot" });

    const enriched = messages.map((m) => ({
      ...m,
      sender: senderMap.get(m.senderId) ?? { name: "Unknown", type: m.senderType },
    }));

    return NextResponse.json({ messages: enriched, nextCursor });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id } = await params;

    // Verify chatgroup belongs to tenant
    const group = await prisma.chatGroup.findFirst({
      where: { id, team: { tenantId: auth.tenantId } },
      include: {
        members: true,
      },
    });

    if (!group) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    // Verify membership
    const isMember = group.members.some((m) => m.memberId === auth.userId);
    if (!isMember) {
      throw new ApiError(403, "forbidden", "You are not a member of this chatgroup.");
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      throw new ApiError(400, "validation_error", "Message content is required.");
    }

    const sanitizedContent = sanitizeString(content);

    const mentionPattern = /@(\w+)/g;
    const mentionNames: string[] = [];
    let match;
    while ((match = mentionPattern.exec(sanitizedContent)) !== null) {
      mentionNames.push(match[1]);
    }
    console.log("[MESSAGES] mentionNames:", mentionNames);

    let mentions: { id: string; name: string; type: string }[] | null = null;

    if (mentionNames.length > 0) {
      const memberIds = group.members.map((m) => m.memberId);
      console.log("[MESSAGES] memberIds:", memberIds);

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

    const message = await prisma.message.create({
      data: {
        chatGroupId: id,
        senderId: auth.userId,
        senderType: "human",
        content: sanitizedContent,
        mentions: mentions ?? undefined,
      },
    });

    const sender = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true },
    });

    publishMessage(id, {
      type: "new_message",
      message: {
        ...message,
        sender: { name: sender?.name ?? "Unknown", type: "human" },
      },
    }).catch(() => {});


    // Route @mentions to robot-specific pub/sub channels
    if (mentions) {
      const robotMentions = mentions.filter((m) => m.type === "robot");
      if (robotMentions.length > 0) {
        const mentionPayload = {
          type: "mention",
          message: {
            id: message.id,
            chatGroupId: id,
            content: message.content,
            senderId: auth.userId,
            senderType: "human",
            senderName: sender?.name ?? "Unknown",
            createdAt: message.createdAt,
            mentions: message.mentions,
          },
        };
        Promise.all(
          robotMentions.map((r) => publishToRobot(r.id, mentionPayload))
        ).catch(() => {});
      }
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
