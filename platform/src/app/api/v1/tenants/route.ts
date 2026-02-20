import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireTenantAuth, signTenantToken } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/sanitize";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const tenantUsers = await prisma.tenantUser.findMany({
      where: { userId: auth.userId },
      include: { tenant: true },
    });

    return NextResponse.json({
      tenants: tenantUsers.map((tu) => ({
        id: tu.tenant.id,
        name: tu.tenant.name,
        slug: tu.tenant.slug,
        role: tu.role,
        joinedAt: tu.joinedAt,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      throw new ApiError(400, "validation_error", "Name and slug are required.");
    }

    const sanitizedName = sanitizeString(name);
    const sanitizedSlug = sanitizeString(slug);

    const existing = await prisma.tenant.findUnique({ where: { slug: sanitizedSlug } });
    if (existing) {
      throw new ApiError(409, "slug_taken", "This slug is already in use.");
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: sanitizedName,
        slug: sanitizedSlug,
        ownerId: auth.userId,
        users: {
          create: {
            userId: auth.userId,
            role: "owner",
          },
        },
      },
    });

    // Return a new token with tenant context
    const token = signTenantToken({
      userId: auth.userId,
      email: auth.email,
      tenantId: tenant.id,
      role: "owner",
    });

    return NextResponse.json(
      {
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        token,
      },
      { status: 201 }
    );
  } catch (err) {
    return handleError(err);
  }
}
