import { NextRequest, NextResponse } from "next/server";
import { requireTenantAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Find users that belong to this tenant, matching name or email
    const tenantUsers = await prisma.tenantUser.findMany({
      where: {
        tenantId: auth.tenantId,
        user: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      take: 5,
    });

    const users = tenantUsers.map((tu) => tu.user);

    return NextResponse.json({ users });
  } catch (err) {
    return handleError(err);
  }
}
