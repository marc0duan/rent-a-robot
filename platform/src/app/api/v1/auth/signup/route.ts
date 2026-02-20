import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signUserToken, signTenantToken } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/sanitize";
import { validateInvitation, acceptInvitation } from "@/services/invitation";

export async function POST(request: NextRequest) {
  try {
    await applyRateLimit(request, "ip");

    const body = await request.json();
    const { email, password, name, phone, invitationToken } = body;

    if (!email || !password || !name) {
      throw new ApiError(400, "validation_error", "Email, password, and name are required.");
    }

    const sanitizedEmail = sanitizeString(email);
    const sanitizedName = sanitizeString(name);

    // Validate invitation token if provided
    let invitation = null;
    if (invitationToken) {
      const validation = await validateInvitation(invitationToken);
      if (!validation.valid) {
        throw new ApiError(400, "invalid_invitation", validation.error || "Invalid invitation");
      }
      invitation = validation.invitation;

      // Verify email matches
      if (sanitizedEmail.toLowerCase() !== invitation?.email) {
        throw new ApiError(
          400,
          "email_mismatch",
          "The email address must match the invitation"
        );
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: sanitizedEmail } });
    if (existing) {
      throw new ApiError(409, "user_exists", "A user with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: sanitizedEmail,
        name: sanitizedName,
        phone: phone || null,
        passwordHash,
      },
    });

    // Accept invitation and add user to tenant if token was provided
    let tenantToken = null;
    let tenantInfo = null;
    if (invitationToken && invitation) {
      await acceptInvitation(invitationToken, user.id);

      // Fetch tenant info to return to client
      const tenant = await prisma.tenant.findUnique({
        where: { id: invitation.tenantId },
        select: { id: true, name: true, slug: true },
      });

      if (tenant) {
        tenantInfo = { id: tenant.id, name: tenant.name, slug: tenant.slug };
      }

      // Generate tenant-scoped token
      tenantToken = signTenantToken({
        userId: user.id,
        email: user.email,
        tenantId: invitation.tenantId,
        role: invitation.role,
      });
    }

    // Generate user token (no tenant context yet)
    const userToken = signUserToken({ userId: user.id, email: user.email });

    return NextResponse.json(
      {
        user: { id: user.id, email: user.email, name: user.name },
        token: userToken,
        tenantToken,
        invitationAccepted: !!invitation,
        tenant: tenantInfo,
      },
      { status: 201 }
    );
  } catch (err) {
    return handleError(err);
  }
}
