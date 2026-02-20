import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRobotAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";
import { decrypt } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRobotAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "robot", auth.robotId);

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

    // Fetch tenant LLM config (decrypted for robot use)
    const llmConfig = await prisma.tenantLlmConfig.findUnique({
      where: { tenantId: auth.tenantId },
    });

    let llm: { provider: string; apiKey: string; baseUrl: string | null; model: string | null } | null = null;
    if (llmConfig) {
      llm = {
        provider: llmConfig.provider,
        apiKey: decrypt(llmConfig.apiKeyEnc),
        baseUrl: llmConfig.baseUrl,
        model: llmConfig.model,
      };
    }

    return NextResponse.json({
      robot: {
        id: robot.id,
        name: robot.name,
        soulMd: robot.soulMd,
      },
      tenant: robot.tenant,
      teams: teamMemberships.map((tm) => tm.team),
      chatgroups: chatGroupMemberships.map((cgm) => cgm.group),
      config: {
        platformUrl: process.env.NEXT_PUBLIC_PLATFORM_URL ?? "http://localhost:3000",
        llm,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
