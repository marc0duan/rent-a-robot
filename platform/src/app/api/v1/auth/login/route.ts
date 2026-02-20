import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signUserToken } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/sanitize";

export async function POST(request: NextRequest) {
  try {
    await applyRateLimit(request, "ip");

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      throw new ApiError(400, "validation_error", "Email and password are required.");
    }

    const sanitizedEmail = sanitizeString(email);

    const user = await prisma.user.findUnique({ where: { email: sanitizedEmail } });
    if (!user) {
      throw new ApiError(401, "invalid_credentials", "Invalid email or password.");
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "invalid_credentials", "Invalid email or password.");
    }

    // Get user's tenants
    const tenantUsers = await prisma.tenantUser.findMany({
      where: { userId: user.id },
      include: { tenant: true },
    });

    // Generate token (no tenant context yet)
    const token = signUserToken({ userId: user.id, email: user.email });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
      tenants: tenantUsers.map((tu) => ({
        tenantId: tu.tenant.id,
        role: tu.role,
        tenant: {
          id: tu.tenant.id,
          name: tu.tenant.name,
          slug: tu.tenant.slug,
        },
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
