import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";

// GET /api/v1/teams - List teams within the active tenant
export async function GET(request: NextRequest) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

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

// POST /api/v1/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { name } = body;

    if (!name) {
      throw new ApiError(400, "validation_error", "Team name is required.");
    }

    // Create team and add the creator as a member
    const team = await prisma.team.create({
      data: {
        name,
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
