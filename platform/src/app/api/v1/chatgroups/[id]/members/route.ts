import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";

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
      where: { id, team: { tenantId: auth.tenantId } },
      include: {
        members: true,
        team: { select: { id: true, name: true } },
      },
    });

    if (!group) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    // Enrich members with user/robot details
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

    return NextResponse.json({ members: enrichedMembers });
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
    const body = await request.json();
    const { memberId, memberType } = body;

    if (!memberId || !memberType) {
      throw new ApiError(400, "validation_error", "memberId and memberType are required.");
    }

    if (!["human", "robot"].includes(memberType)) {
      throw new ApiError(400, "validation_error", "memberType must be 'human' or 'robot'.");
    }

    // Verify chatgroup belongs to tenant
    const group = await prisma.chatGroup.findFirst({
      where: { id, team: { tenantId: auth.tenantId } },
    });

    if (!group) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    // Verify member exists in tenant
    if (memberType === "human") {
      const user = await prisma.tenantUser.findUnique({
        where: { userId_tenantId: { userId: memberId, tenantId: auth.tenantId } },
      });
      if (!user) {
        throw new ApiError(404, "not_found", "User not found in this tenant.");
      }
    } else {
      const robot = await prisma.robot.findFirst({
        where: { id: memberId, tenantId: auth.tenantId },
      });
      if (!robot) {
        throw new ApiError(404, "not_found", "Robot not found in this tenant.");
      }
    }

    // Check if already a member
    const existingMember = await prisma.chatGroupMember.findFirst({
      where: { chatGroupId: id, memberId },
    });

    if (existingMember) {
      throw new ApiError(400, "validation_error", "Member already in this chatgroup.");
    }

    // Check: must have at least 1 human member
    const humanMembers = await prisma.chatGroupMember.count({
      where: { chatGroupId: id, memberType: "human" },
    });

    // If adding a robot and there are no humans, that's not allowed
    if (memberType === "robot" && humanMembers === 0) {
      throw new ApiError(400, "validation_error", "Cannot add a robot as the only member. Add a human first.");
    }

    const member = await prisma.chatGroupMember.create({
      data: { chatGroupId: id, memberId, memberType },
    });

    // Fetch enriched data for response
    let enrichedMember;
    if (memberType === "human") {
      const user = await prisma.user.findUnique({
        where: { id: memberId },
        select: { id: true, name: true },
      });
      enrichedMember = { ...member, user, robot: null };
    } else {
      const robot = await prisma.robot.findUnique({
        where: { id: memberId },
        select: { id: true, name: true },
      });
      enrichedMember = { ...member, user: null, robot };
    }

    return NextResponse.json({ member: enrichedMember }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
