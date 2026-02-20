import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, signTenantToken } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId) {
      throw new ApiError(400, "validation_error", "tenantId is required.");
    }

    // Verify user belongs to this tenant
    const tenantUser = await prisma.tenantUser.findUnique({
      where: {
        userId_tenantId: {
          userId: auth.userId,
          tenantId,
        },
      },
      include: { tenant: true },
    });

    if (!tenantUser) {
      throw new ApiError(403, "forbidden", "You do not belong to this tenant.");
    }

    // Sign a new token with tenant context
    const token = signTenantToken({
      userId: auth.userId,
      email: auth.email,
      tenantId: tenantUser.tenantId,
      role: tenantUser.role,
    });

    return NextResponse.json({
      token,
      tenant: {
        id: tenantUser.tenant.id,
        name: tenantUser.tenant.name,
        slug: tenantUser.tenant.slug,
      },
      role: tenantUser.role,
    });
  } catch (err) {
    return handleError(err);
  }
}
