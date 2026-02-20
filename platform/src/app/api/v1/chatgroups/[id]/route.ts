import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
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

    const group = await prisma.chatGroup.findFirst({
      where: {
        id,
        team: { tenantId: auth.tenantId },
      },
      include: {
        members: true,
        team: { select: { id: true, name: true } },
        _count: { select: { messages: true, members: true } },
      },
    });

    if (!group) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    // Enrich members with user/robot details
    const memberIds = group.members.map((m) => m.memberId);
    const humanIds = group.members.filter((m) => m.memberType === "human").map((m) => m.memberId);
    const robotIds = group.members.filter((m) => m.memberType === "robot").map((m) => m.memberId);

    const [users, robots] = await Promise.all([
      humanIds.length > 0 ? prisma.user.findMany({
        where: { id: { in: humanIds } },
        select: { id: true, name: true },
      }) : [],
      robotIds.length > 0 ? prisma.robot.findMany({
        where: { id: { in: robotIds } },
        select: { id: true, name: true },
      }) : [],
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const robotMap = new Map(robots.map((r) => [r.id, r]));

    const enrichedMembers = group.members.map((m) => ({
      ...m,
      user: m.memberType === "human" ? userMap.get(m.memberId) : null,
      robot: m.memberType === "robot" ? robotMap.get(m.memberId) : null,
    }));

    return NextResponse.json({ chatgroup: { ...group, members: enrichedMembers } });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    const existing = await prisma.chatGroup.findFirst({
      where: { id, team: { tenantId: auth.tenantId } },
    });

    if (!existing) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    const sanitizedName = name ? sanitizeString(name) : undefined;

    const group = await prisma.chatGroup.update({
      where: { id },
      data: { ...(sanitizedName && { name: sanitizedName }) },
    });

    return NextResponse.json({ chatgroup: group });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id } = await params;

    const existing = await prisma.chatGroup.findFirst({
      where: { id, team: { tenantId: auth.tenantId } },
    });

    if (!existing) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    await prisma.chatGroup.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
