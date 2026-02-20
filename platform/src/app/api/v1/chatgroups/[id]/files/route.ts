import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import {
  getStoragePath,
  saveFile,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
} from "@/lib/storage";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id } = await params;

    const group = await prisma.chatGroup.findFirst({
      where: { id, team: { tenantId: auth.tenantId } },
      select: { id: true, teamId: true },
    });

    if (!group) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    const membership = await prisma.chatGroupMember.findUnique({
      where: {
        chatGroupId_memberId: { chatGroupId: id, memberId: auth.userId },
      },
    });

    if (!membership) {
      throw new ApiError(
        403,
        "forbidden",
        "You are not a member of this chatgroup."
      );
    }

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

    const serialized = files.map((f) => ({
      ...f,
      size: Number(f.size),
    }));

    return NextResponse.json({ files: serialized });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id } = await params;

    const group = await prisma.chatGroup.findFirst({
      where: { id, team: { tenantId: auth.tenantId } },
      select: { id: true, teamId: true },
    });

    if (!group) {
      throw new ApiError(404, "not_found", "ChatGroup not found.");
    }

    const membership = await prisma.chatGroupMember.findUnique({
      where: {
        chatGroupId_memberId: { chatGroupId: id, memberId: auth.userId },
      },
    });

    if (!membership) {
      throw new ApiError(
        403,
        "forbidden",
        "You are not a member of this chatgroup."
      );
    }

    const formData = await request.formData();
    const fileField = formData.get("file");

    if (!fileField || !(fileField instanceof File)) {
      throw new ApiError(
        400,
        "validation_error",
        "A file field is required in multipart form data."
      );
    }

    if (fileField.size > MAX_FILE_SIZE) {
      throw new ApiError(
        413,
        "file_too_large",
        `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
      );
    }

    const mimeType = fileField.type || "application/octet-stream";
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new ApiError(
        415,
        "unsupported_media_type",
        `MIME type "${mimeType}" is not allowed.`
      );
    }

    const filename = fileField.name || "unnamed";
    const storagePath = getStoragePath(
      auth.tenantId,
      group.teamId,
      id,
      filename
    );

    const arrayBuffer = await fileField.arrayBuffer();
    await saveFile(storagePath, Buffer.from(arrayBuffer));

    const file = await prisma.workspaceFile.create({
      data: {
        path: storagePath,
        filename,
        mimeType,
        size: BigInt(fileField.size),
        uploadedById: auth.userId,
        scope: "chatgroup",
        scopeId: id,
      },
    });

    return NextResponse.json(
      { file: { ...file, size: Number(file.size) } },
      { status: 201 }
    );
  } catch (err) {
    return handleError(err);
  }
}
