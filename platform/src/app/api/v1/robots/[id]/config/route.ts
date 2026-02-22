import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type RobotAuthPayload } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";
import { decrypt } from "@/lib/crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const robotToken = request.headers.get("x-robot-token");
    if (!robotToken) {
      return NextResponse.json(
        {
          error: {
            code: "unauthorized",
            message: "Missing X-Robot-Token header.",
          },
        },
        { status: 401 }
      );
    }

    let auth: RobotAuthPayload;
    try {
      auth = verifyToken<RobotAuthPayload>(robotToken);
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "unauthorized",
            message: "Invalid or expired robot token.",
          },
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (auth.robotId !== id) {
      return NextResponse.json(
        {
          error: {
            code: "forbidden",
            message: "Cannot access another robot's configuration.",
          },
        },
        { status: 403 }
      );
    }

    await applyRateLimit(request, "robot", auth.robotId);

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

    const teamMemberships = await prisma.teamMember.findMany({
      where: { memberId: auth.robotId, memberType: "robot" },
      include: {
        team: {
          select: { id: true, name: true },
        },
      },
    });

    const chatGroupMemberships = await prisma.chatGroupMember.findMany({
      where: { memberId: auth.robotId, memberType: "robot" },
      include: {
        group: {
          select: { id: true, name: true, teamId: true },
        },
      },
    });

    if (robot.status === "onboarding") {
      await prisma.robot.update({
        where: { id: auth.robotId },
        data: { status: "onboard" },
      });
    }

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
        status: robot.status,
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
