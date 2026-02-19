import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";

// GET /api/v1/teams/[id] - Get team details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const team = await prisma.team.findFirst({
      where: { id, tenantId: auth.tenantId },
      include: {
        members: true,
        groups: { select: { id: true, name: true } },
        _count: { select: { members: true, groups: true, files: true } },
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

// PUT /api/v1/teams/[id] - Update team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    const team = await prisma.team.updateMany({
      where: { id, tenantId: auth.tenantId },
      data: { ...(name && { name }) },
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

// DELETE /api/v1/teams/[id] - Disband team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

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
