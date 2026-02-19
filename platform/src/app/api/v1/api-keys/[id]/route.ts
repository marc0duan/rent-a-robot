import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";

// DELETE /api/v1/api-keys/[id] - Revoke an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    if (auth.role !== "admin" && auth.role !== "owner") {
      throw new ApiError(403, "forbidden", "Only admins and owners can manage API keys.");
    }

    const { id } = await params;

    const apiKey = await prisma.apiKey.findFirst({
      where: { id, tenantId: auth.tenantId },
    });

    if (!apiKey) {
      throw new ApiError(404, "not_found", "API key not found.");
    }

    await prisma.apiKey.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
