import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";

// GET /api/v1/chatgroups - List chat groups
export async function GET(request: NextRequest) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    // Find chatgroups the user is a member of, within the tenant
    const groups = await prisma.chatGroup.findMany({
      where: {
        team: { tenantId: auth.tenantId },
        members: { some: { memberId: auth.userId } },
      },
      include: {
        _count: { select: { members: true, messages: true } },
        team: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ chatgroups: groups });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/v1/chatgroups - Create a new chat group
export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { name, teamId, memberIds } = body;

    if (!name || !teamId) {
      throw new ApiError(400, "validation_error", "Name and teamId are required.");
    }

    // Verify team belongs to tenant
    const team = await prisma.team.findFirst({
      where: { id: teamId, tenantId: auth.tenantId },
    });

    if (!team) {
      throw new ApiError(404, "not_found", "Team not found.");
    }

    // Build members list (always include creator)
    const members: Array<{ memberId: string; memberType: string }> = [
      { memberId: auth.userId, memberType: "human" },
    ];

    if (memberIds && Array.isArray(memberIds)) {
      for (const m of memberIds) {
        if (m.memberId !== auth.userId) {
          members.push({ memberId: m.memberId, memberType: m.memberType });
        }
      }
    }

    // Validate: at least 2 members, at least 1 human
    if (members.length < 2) {
      throw new ApiError(400, "validation_error", "A chatgroup must have at least 2 members.");
    }

    const hasHuman = members.some((m) => m.memberType === "human");
    if (!hasHuman) {
      throw new ApiError(400, "validation_error", "A chatgroup must have at least 1 human member.");
    }

    const group = await prisma.chatGroup.create({
      data: {
        name,
        teamId,
        createdById: auth.userId,
        members: {
          create: members,
        },
      },
      include: { members: true },
    });

    return NextResponse.json({ chatgroup: group }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
