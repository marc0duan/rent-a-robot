import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id, memberId } = await params;

    // Verify team belongs to tenant
    const team = await prisma.team.findFirst({
      where: { id, tenantId: auth.tenantId },
    });

    if (!team) {
      throw new ApiError(404, "not_found", "Team not found.");
    }

    const result = await prisma.teamMember.deleteMany({
      where: { teamId: id, memberId },
    });

    if (result.count === 0) {
      throw new ApiError(404, "not_found", "Member not found in team.");
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
