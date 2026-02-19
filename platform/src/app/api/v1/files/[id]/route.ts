import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";

// GET /api/v1/files/[id] - Get file metadata
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const file = await prisma.workspaceFile.findUnique({
      where: { id },
    });

    if (!file) {
      throw new ApiError(404, "not_found", "File not found.");
    }

    // Verify access based on scope hierarchy
    let hasAccess = false;

    if (file.scope === "tenant") {
      // User must belong to the tenant
      hasAccess = file.scopeId === auth.tenantId;
    } else if (file.scope === "team") {
      // User must be a member of the team
      const teamMembership = await prisma.teamMember.findUnique({
        where: { teamId_memberId: { teamId: file.scopeId, memberId: auth.userId } },
      });
      hasAccess = !!teamMembership;
    } else if (file.scope === "chatgroup") {
      // User must be a member of the chatgroup
      const groupMembership = await prisma.chatGroupMember.findUnique({
        where: { chatGroupId_memberId: { chatGroupId: file.scopeId, memberId: auth.userId } },
      });
      hasAccess = !!groupMembership;
    }

    if (!hasAccess) {
      throw new ApiError(403, "forbidden", "You do not have access to this file.");
    }

    return NextResponse.json({
      file: {
        ...file,
        size: Number(file.size),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/v1/files/[id] - Delete a file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const file = await prisma.workspaceFile.findUnique({
      where: { id },
    });

    if (!file) {
      throw new ApiError(404, "not_found", "File not found.");
    }

    // Verify access - uploader can delete, or admin/owner
    const isUploader = file.uploadedById === auth.userId;
    const isPrivileged = auth.role === "admin" || auth.role === "owner";

    if (!isUploader && !isPrivileged) {
      throw new ApiError(403, "forbidden", "You do not have permission to delete this file.");
    }

    // Also verify the file is within the user's tenant scope
    let inTenant = false;

    if (file.scope === "tenant") {
      inTenant = file.scopeId === auth.tenantId;
    } else if (file.scope === "team") {
      const team = await prisma.team.findFirst({
        where: { id: file.scopeId, tenantId: auth.tenantId },
      });
      inTenant = !!team;
    } else if (file.scope === "chatgroup") {
      const group = await prisma.chatGroup.findFirst({
        where: { id: file.scopeId, team: { tenantId: auth.tenantId } },
      });
      inTenant = !!group;
    }

    if (!inTenant) {
      throw new ApiError(404, "not_found", "File not found.");
    }

    await prisma.workspaceFile.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
