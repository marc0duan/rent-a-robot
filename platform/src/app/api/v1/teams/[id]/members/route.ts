import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";

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

    // Verify team belongs to tenant
    const team = await prisma.team.findFirst({
      where: { id, tenantId: auth.tenantId },
    });

    if (!team) {
      throw new ApiError(404, "not_found", "Team not found.");
    }

    // Verify member exists
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

    const member = await prisma.teamMember.create({
      data: { teamId: id, memberId, memberType },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
