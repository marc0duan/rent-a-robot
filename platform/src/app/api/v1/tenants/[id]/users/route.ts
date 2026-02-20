import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
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
