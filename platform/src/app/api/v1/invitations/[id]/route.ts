import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";
import { revokeInvitation } from "@/services/invitation";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only owners and admins can revoke invitations
    const auth = await requireRole(request, ["owner", "admin"]);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id: invitationId } = await params;

    // Get the invitation to verify it belongs to the user's tenant
    const invitation = await prisma.tenantInvitation.findUnique({
      where: { id: invitationId },
      select: { tenantId: true },
    });

    if (!invitation) {
      throw new ApiError(404, "not_found", "Invitation not found.");
    }

    // Verify user belongs to the same tenant
    if (invitation.tenantId !== auth.tenantId) {
      throw new ApiError(403, "forbidden", "You do not have access to this invitation.");
    }

    await revokeInvitation(invitationId);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
