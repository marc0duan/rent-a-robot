import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/sanitize";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const teams = await prisma.team.findMany({
      where: { tenantId: auth.tenantId },
      include: {
        _count: { select: { members: true, groups: true } },
      },
    });

    return NextResponse.json({ teams });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const body = await request.json();
    const { name } = body;

    if (!name) {
      throw new ApiError(400, "validation_error", "Team name is required.");
    }

    const sanitizedName = sanitizeString(name);

    const team = await prisma.team.create({
      data: {
        name: sanitizedName,
        tenantId: auth.tenantId,
        members: {
          create: {
            memberId: auth.userId,
            memberType: "human",
          },
        },
        // Create a default chatgroup
        groups: {
          create: {
            name: "General",
            createdById: auth.userId,
            members: {
              create: {
                memberId: auth.userId,
                memberType: "human",
              },
            },
          },
        },
      },
      include: {
        members: true,
        groups: true,
      },
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
