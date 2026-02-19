import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";

// GET /api/v1/chatgroups/[id]/files - List files with inheritance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    // Verify chatgroup belongs to tenant and get teamId
    const group = await prisma.chatGroup.findFirst({
      where: { id, team: { tenantId: auth.tenantId } },
      select: { id: true, teamId: true },
    });

    if (!group) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    // Verify membership
    const membership = await prisma.chatGroupMember.findUnique({
      where: { chatGroupId_memberId: { chatGroupId: id, memberId: auth.userId } },
    });

    if (!membership) {
      throw new ApiError(403, "forbidden", "You are not a member of this chatgroup.");
    }

    // Fetch files with inheritance: chatgroup + team + tenant level
    const files = await prisma.workspaceFile.findMany({
      where: {
        OR: [
          { scope: "chatgroup", scopeId: id },
          { scope: "team", scopeId: group.teamId },
          { scope: "tenant", scopeId: auth.tenantId },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Convert BigInt size to number for JSON serialization
    const serialized = files.map((f) => ({
      ...f,
      size: Number(f.size),
    }));

    return NextResponse.json({ files: serialized });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/v1/chatgroups/[id]/files - Upload file metadata (stub)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    // Verify chatgroup belongs to tenant
    const group = await prisma.chatGroup.findFirst({
      where: { id, team: { tenantId: auth.tenantId } },
      select: { id: true, teamId: true },
    });

    if (!group) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    // Verify membership
    const membership = await prisma.chatGroupMember.findUnique({
      where: { chatGroupId_memberId: { chatGroupId: id, memberId: auth.userId } },
    });

    if (!membership) {
      throw new ApiError(403, "forbidden", "You are not a member of this chatgroup.");
    }

    const body = await request.json();
    const { filename, mimeType, size } = body;

    if (!filename || typeof filename !== "string") {
      throw new ApiError(400, "validation_error", "Filename is required.");
    }
    if (!mimeType || typeof mimeType !== "string") {
      throw new ApiError(400, "validation_error", "MIME type is required.");
    }
    if (size === undefined || typeof size !== "number" || size < 0) {
      throw new ApiError(400, "validation_error", "File size is required and must be non-negative.");
    }

    // Generate storage path (actual file upload is not yet implemented)
    const path = `/workspace/${auth.tenantId}/${group.teamId}/${id}/${filename}`;

    const file = await prisma.workspaceFile.create({
      data: {
        path,
        filename,
        mimeType,
        size: BigInt(size),
        uploadedById: auth.userId,
        scope: "chatgroup",
        scopeId: id,
      },
    });

    return NextResponse.json(
      {
        file: {
          ...file,
          size: Number(file.size),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return handleError(err);
  }
}
