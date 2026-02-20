import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth, requireRole } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/sanitize";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, ["owner", "admin"]);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id } = await params;

    if (auth.tenantId !== id) {
      throw new ApiError(403, "forbidden", "You do not have access to this tenant.");
    }

    const body = await request.json();
    const { name } = body;

    const sanitizedName = name ? sanitizeString(name) : undefined;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { ...(sanitizedName && { name: sanitizedName }) },
    });

    return NextResponse.json({ tenant });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, ["owner"]);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

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
