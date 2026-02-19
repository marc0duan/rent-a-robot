import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";

// GET /api/v1/tenants/[id]/users - List users in a tenant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    if (auth.tenantId !== id) {
      throw new ApiError(403, "forbidden", "You do not have access to this tenant.");
    }

    const tenantUsers = await prisma.tenantUser.findMany({
      where: { tenantId: id },
      include: {
        user: {
          select: { id: true, email: true, name: true, createdAt: true },
        },
      },
    });

    return NextResponse.json({
      users: tenantUsers.map((tu) => ({
        ...tu.user,
        role: tu.role,
        joinedAt: tu.joinedAt,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
