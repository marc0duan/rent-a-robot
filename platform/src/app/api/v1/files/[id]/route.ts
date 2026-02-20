import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth, verifyToken, type TenantAuthPayload } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { readFileStream, deleteFile, fileExists } from "@/lib/storage";
import { stat } from "fs/promises";
import { applyRateLimit } from "@/lib/rate-limit";

async function verifyFileAccess(
  file: { scope: string; scopeId: string },
  auth: { tenantId: string; userId: string }
): Promise<boolean> {
  if (file.scope === "tenant") {
    return file.scopeId === auth.tenantId;
  }
  if (file.scope === "team") {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_memberId: { teamId: file.scopeId, memberId: auth.userId },
      },
    });
    return !!membership;
  }
  if (file.scope === "chatgroup") {
    const membership = await prisma.chatGroupMember.findUnique({
      where: {
        chatGroupId_memberId: {
          chatGroupId: file.scopeId,
          memberId: auth.userId,
        },
      },
    });
    return !!membership;
  }
  return false;
}

async function verifyTenantScope(
  file: { scope: string; scopeId: string },
  tenantId: string
): Promise<boolean> {
  if (file.scope === "tenant") {
    return file.scopeId === tenantId;
  }
  if (file.scope === "team") {
    const team = await prisma.team.findFirst({
      where: { id: file.scopeId, tenantId },
    });
    return !!team;
  }
  if (file.scope === "chatgroup") {
    const group = await prisma.chatGroup.findFirst({
      where: { id: file.scopeId, team: { tenantId } },
    });
    return !!group;
  }
  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const url = new URL(request.url);
    const download = url.searchParams.get("download");

    let auth: TenantAuthPayload;
    if (download === "true") {
      const authHeader = request.headers.get("authorization");
      const tokenStr = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : url.searchParams.get("token");

      if (!tokenStr) {
        return NextResponse.json(
          { error: { code: "unauthorized", message: "Missing authentication token." } },
          { status: 401 }
        );
      }
      try {
        auth = verifyToken<TenantAuthPayload>(tokenStr);
      } catch {
        return NextResponse.json(
          { error: { code: "unauthorized", message: "Invalid or expired token." } },
          { status: 401 }
        );
      }
      if (!auth.tenantId) {
        return NextResponse.json(
          { error: { code: "no_tenant_context", message: "Token does not contain tenant context." } },
          { status: 403 }
        );
      }
    } else {
      const result = await requireTenantAuth(request);
      if (result instanceof NextResponse) return result;
      auth = result;
    }

    await applyRateLimit(request, "user", auth.userId);

    const { id } = await params;

    const file = await prisma.workspaceFile.findUnique({ where: { id } });
    if (!file) {
      throw new ApiError(404, "not_found", "File not found.");
    }

    const hasAccess = await verifyFileAccess(file, auth);
    if (!hasAccess) {
      throw new ApiError(
        403,
        "forbidden",
        "You do not have access to this file."
      );
    }

    if (download === "true") {
      const exists = await fileExists(file.path);
      if (!exists) {
        throw new ApiError(
          404,
          "file_not_on_disk",
          "Physical file not found on disk."
        );
      }

      const fileStat = await stat(file.path);
      const nodeStream = readFileStream(file.path);

      const webStream = new ReadableStream({
        start(controller) {
          nodeStream.on("data", (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk));
          });
          nodeStream.on("end", () => controller.close());
          nodeStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          nodeStream.destroy();
        },
      });

      return new NextResponse(webStream, {
        status: 200,
        headers: {
          "Content-Type": file.mimeType,
          "Content-Length": fileStat.size.toString(),
          "Content-Disposition": `attachment; filename="${encodeURIComponent(file.filename)}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    return NextResponse.json({
      file: { ...file, size: Number(file.size) },
    });
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

    const file = await prisma.workspaceFile.findUnique({ where: { id } });
    if (!file) {
      throw new ApiError(404, "not_found", "File not found.");
    }

    const isUploader = file.uploadedById === auth.userId;
    const isPrivileged = auth.role === "admin" || auth.role === "owner";
    if (!isUploader && !isPrivileged) {
      throw new ApiError(
        403,
        "forbidden",
        "You do not have permission to delete this file."
      );
    }

    const inTenant = await verifyTenantScope(file, auth.tenantId);
    if (!inTenant) {
      throw new ApiError(404, "not_found", "File not found.");
    }

    await deleteFile(file.path);
    await prisma.workspaceFile.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
