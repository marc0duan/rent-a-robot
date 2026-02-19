import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireTenantAuth, signTenantToken } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";

// GET /api/v1/tenants - List tenants the user belongs to
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

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

// POST /api/v1/tenants - Create a new tenant
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      throw new ApiError(400, "validation_error", "Name and slug are required.");
    }

    // Check slug uniqueness
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      throw new ApiError(409, "slug_taken", "This slug is already in use.");
    }

    // Create tenant and assign owner role
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
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
