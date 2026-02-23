import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";
import { publishToRobot } from "@/lib/pubsub";

interface RouteParams {
  params: Promise<{ id: string; skillId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id: robotId, skillId } = await params;

    // Verify robot belongs to tenant
    const robot = await prisma.robot.findFirst({
      where: { id: robotId, tenantId: auth.tenantId },
    });

    if (!robot) {
      throw new ApiError(404, "not_found", "Robot not found.");
    }

    const skill = await prisma.platformSkill.findFirst({
      where: { id: skillId, robotId },
    });

    if (!skill) {
      throw new ApiError(404, "not_found", "Skill not found.");
    }

    return NextResponse.json({ skill });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id: robotId, skillId } = await params;
    const body = await request.json();
    const { name, description, skillMd } = body;

    // Verify robot belongs to tenant
    const robot = await prisma.robot.findFirst({
      where: { id: robotId, tenantId: auth.tenantId },
    });

    if (!robot) {
      throw new ApiError(404, "not_found", "Robot not found.");
    }

    const existing = await prisma.platformSkill.findFirst({
      where: { id: skillId, robotId },
    });

    if (!existing) {
      throw new ApiError(404, "not_found", "Skill not found.");
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existing.name) {
      const duplicate = await prisma.platformSkill.findUnique({
        where: { robotId_name: { robotId, name } },
      });
      if (duplicate) {
        throw new ApiError(
          409,
          "conflict",
          `Skill "${name}" already exists for this robot.`
        );
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        throw new ApiError(
          400,
          "validation_error",
          "Skill name must be alphanumeric with dashes/underscores only."
        );
      }
    }

    const updated = await prisma.platformSkill.update({
      where: { id: skillId },
      data: {
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        skillMd: skillMd || existing.skillMd,
      },
    });

    // Publish sync_skills event to robot
    await publishToRobot(robotId, {
      type: "sync_skills",
      action: "updated",
      skillId: updated.id,
      skillName: updated.name,
    });

    return NextResponse.json({ skill: updated });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id: robotId, skillId } = await params;

    // Verify robot belongs to tenant
    const robot = await prisma.robot.findFirst({
      where: { id: robotId, tenantId: auth.tenantId },
    });

    if (!robot) {
      throw new ApiError(404, "not_found", "Robot not found.");
    }

    const existing = await prisma.platformSkill.findFirst({
      where: { id: skillId, robotId },
    });

    if (!existing) {
      throw new ApiError(404, "not_found", "Skill not found.");
    }

    await prisma.platformSkill.delete({
      where: { id: skillId },
    });

    // Publish sync_skills event to robot
    await publishToRobot(robotId, {
      type: "sync_skills",
      action: "deleted",
      skillId: existing.id,
      skillName: existing.name,
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
