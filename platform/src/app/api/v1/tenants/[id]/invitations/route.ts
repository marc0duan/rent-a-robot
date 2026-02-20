import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";
import { createInvitation, listInvitations } from "@/services/invitation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, ["owner", "admin", "user"]);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id: tenantId } = await params;

    // Users can only access their own tenant
    if (auth.tenantId !== tenantId) {
      throw new ApiError(403, "forbidden", "You do not have access to this tenant.");
    }

    const invitations = await listInvitations(tenantId);

    return NextResponse.json({ invitations });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only owners and admins can invite
    const auth = await requireRole(request, ["owner", "admin"]);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "invitation", auth.userId);

    const { id: tenantId } = await params;

    // Users can only invite to their own tenant
    if (auth.tenantId !== tenantId) {
      throw new ApiError(403, "forbidden", "You do not have access to this tenant.");
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      throw new ApiError(400, "validation_error", "Email and role are required.");
    }

    if (!["admin", "user"].includes(role)) {
      throw new ApiError(400, "validation_error", "Role must be 'admin' or 'user'.");
    }

    const invitation = await createInvitation({
      tenantId,
      email,
      role,
      invitedBy: auth.userId,
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
