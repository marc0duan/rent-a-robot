import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRobotAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";

// GET /api/v1/onboard - Robot fetches config during onboarding
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRobotAuth(request);
    if (auth instanceof NextResponse) return auth;

    // Fetch robot details
    const robot = await prisma.robot.findUnique({
      where: { id: auth.robotId },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!robot) {
      throw new ApiError(404, "not_found", "Robot not found.");
    }

    // Fetch teams the robot belongs to
    const teamMemberships = await prisma.teamMember.findMany({
      where: { memberId: auth.robotId, memberType: "robot" },
      include: {
        team: {
          select: { id: true, name: true },
        },
      },
    });

    // Fetch chatgroups the robot is a member of
    const chatGroupMemberships = await prisma.chatGroupMember.findMany({
      where: { memberId: auth.robotId, memberType: "robot" },
      include: {
        group: {
          select: { id: true, name: true, teamId: true },
        },
      },
    });

    // Update robot status to onboard
    await prisma.robot.update({
      where: { id: auth.robotId },
      data: { status: "onboard" },
    });

    return NextResponse.json({
      robot: {
        id: robot.id,
        name: robot.name,
        soulMd: robot.soulMd,
      },
      tenant: robot.tenant,
      teams: teamMemberships.map((tm) => tm.team),
      chatgroups: chatGroupMemberships.map((cgm) => cgm.group),
      // LLM config would come from tenant settings in the future
      config: {
        platformUrl: process.env.NEXT_PUBLIC_PLATFORM_URL ?? "http://localhost:3000",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
