import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
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

    const team = await prisma.team.findFirst({
      where: { id, tenantId: auth.tenantId },
      include: {
        members: true,
        groups: { select: { id: true, name: true } },
        _count: { select: { members: true, groups: true } },
      },
    });

    if (!team) {
      throw new ApiError(404, "not_found", "Team not found.");
    }

    return NextResponse.json({ team });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    const sanitizedName = name ? sanitizeString(name) : undefined;

    const team = await prisma.team.updateMany({
      where: { id, tenantId: auth.tenantId },
      data: { ...(sanitizedName && { name: sanitizedName }) },
    });

    if (team.count === 0) {
      throw new ApiError(404, "not_found", "Team not found.");
    }

    const updated = await prisma.team.findUnique({ where: { id } });
    return NextResponse.json({ team: updated });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id } = await params;

    const result = await prisma.team.deleteMany({
      where: { id, tenantId: auth.tenantId },
    });

    if (result.count === 0) {
      throw new ApiError(404, "not_found", "Team not found.");
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
