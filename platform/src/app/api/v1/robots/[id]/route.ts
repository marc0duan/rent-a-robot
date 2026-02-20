import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth, signRobotToken } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/sanitize";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id } = await params;

    const robot = await prisma.robot.findFirst({
      where: { id, tenantId: auth.tenantId },
    });

    if (!robot) {
      throw new ApiError(404, "not_found", "Robot not found.");
    }

    // Don't expose tokenHash
    const { tokenHash, ...robotData } = robot;
    return NextResponse.json({ robot: robotData });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id } = await params;
    const body = await request.json();
    const { name, soulMd, generateToken, tokenExpiresIn } = body;

    const existing = await prisma.robot.findFirst({
      where: { id, tenantId: auth.tenantId },
    });

    if (!existing) {
      throw new ApiError(404, "not_found", "Robot not found.");
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = sanitizeString(name);
    if (soulMd) updateData.soulMd = sanitizeString(soulMd);

    // Generate a new robot token ("Assign a PC" flow)
    let token: string | undefined;
    if (generateToken) {
      // Get robot's team memberships
      const teamMembers = await prisma.teamMember.findMany({
        where: { memberId: id, memberType: "robot" },
        select: { teamId: true },
      });

      token = signRobotToken(
        {
          robotId: id,
          robotName: existing.name,
          creatorId: auth.userId,
          tenantId: auth.tenantId,
          teamIds: teamMembers.map((m) => m.teamId),
        },
        tokenExpiresIn || undefined
      );

      // Store hash of the token for revocation
      const hash = await bcrypt.hash(token, 10);
      updateData.tokenHash = hash;
      updateData.status = "onboarding";
      if (tokenExpiresIn) {
        const ms = parseDuration(tokenExpiresIn);
        if (ms) updateData.tokenExpiresAt = new Date(Date.now() + ms);
      }
    }

    const robot = await prisma.robot.update({
      where: { id },
      data: updateData,
    });

    const { tokenHash, ...robotData } = robot;
    return NextResponse.json({
      robot: robotData,
      ...(token && { token }),
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

    const result = await prisma.robot.deleteMany({
      where: { id, tenantId: auth.tenantId },
    });

    if (result.count === 0) {
      throw new ApiError(404, "not_found", "Robot not found.");
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}

// Simple duration parser (e.g. "30d", "1h", "7d")
function parseDuration(str: string): number | null {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return val * multipliers[unit];
}
