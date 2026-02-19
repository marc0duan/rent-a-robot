import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth, requireRole } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";

// GET /api/v1/tenants/[id] - Get tenant details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    // Users can only access their own tenant
    if (auth.tenantId !== id) {
      throw new ApiError(403, "forbidden", "You do not have access to this tenant.");
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, teams: true, robots: true },
        },
      },
    });

    if (!tenant) {
      throw new ApiError(404, "not_found", "Tenant not found.");
    }

    return NextResponse.json({ tenant });
  } catch (err) {
    return handleError(err);
  }
}

// PUT /api/v1/tenants/[id] - Update tenant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, ["owner", "admin"]);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    if (auth.tenantId !== id) {
      throw new ApiError(403, "forbidden", "You do not have access to this tenant.");
    }

    const body = await request.json();
    const { name } = body;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { ...(name && { name }) },
    });

    return NextResponse.json({ tenant });
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/v1/tenants/[id] - Delete tenant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, ["owner"]);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    if (auth.tenantId !== id) {
      throw new ApiError(403, "forbidden", "You do not have access to this tenant.");
    }

    await prisma.tenant.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
