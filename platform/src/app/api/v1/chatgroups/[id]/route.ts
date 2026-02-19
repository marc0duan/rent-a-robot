import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";

// GET /api/v1/chatgroups/[id] - Get group metadata and members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const group = await prisma.chatGroup.findFirst({
      where: {
        id,
        team: { tenantId: auth.tenantId },
      },
      include: {
        members: true,
        team: { select: { id: true, name: true } },
        _count: { select: { messages: true, files: true } },
      },
    });

    if (!group) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    return NextResponse.json({ chatgroup: group });
  } catch (err) {
    return handleError(err);
  }
}

// PUT /api/v1/chatgroups/[id] - Modify group
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

    // Verify group belongs to tenant
    const existing = await prisma.chatGroup.findFirst({
      where: { id, team: { tenantId: auth.tenantId } },
    });

    if (!existing) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    const group = await prisma.chatGroup.update({
      where: { id },
      data: { ...(name && { name }) },
    });

    return NextResponse.json({ chatgroup: group });
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/v1/chatgroups/[id] - Archive/delete group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const existing = await prisma.chatGroup.findFirst({
      where: { id, team: { tenantId: auth.tenantId } },
    });

    if (!existing) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    await prisma.chatGroup.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
