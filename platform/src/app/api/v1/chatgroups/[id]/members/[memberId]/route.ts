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

    // Verify chatgroup belongs to tenant
    const group = await prisma.chatGroup.findFirst({
      where: { id, team: { tenantId: auth.tenantId } },
    });

    if (!group) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    // Check if member exists
    const existingMember = await prisma.chatGroupMember.findFirst({
      where: { chatGroupId: id, memberId },
    });

    if (!existingMember) {
      throw new ApiError(404, "not_found", "Member not found in this chatgroup.");
    }

    // Check: must have at least 1 human member remaining
    if (existingMember.memberType === "human") {
      const humanMembers = await prisma.chatGroupMember.count({
        where: { chatGroupId: id, memberType: "human" },
      });
      if (humanMembers <= 1) {
        throw new ApiError(400, "validation_error", "Cannot remove the last human member.");
      }
    }

    await prisma.chatGroupMember.delete({
      where: { chatGroupId_memberId: { chatGroupId: id, memberId } },
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
