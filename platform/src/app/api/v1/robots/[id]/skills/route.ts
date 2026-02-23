import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth, requireRobotAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";
import { publishToRobot } from "@/lib/pubsub";
import AdmZip from "adm-zip";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: robotId } = await params;

    // Check for robot token first (for robot fetching its own skills)
    const robotToken = request.headers.get("x-robot-token");
    if (robotToken) {
      const robotAuth = await requireRobotAuth(request);
      if (robotAuth instanceof NextResponse) return robotAuth;

      // Robot can only fetch its own skills
      if (robotAuth.robotId !== robotId) {
        return NextResponse.json(
          { error: { code: "forbidden", message: "Cannot access another robot's skills." } },
          { status: 403 }
        );
      }

      const skills = await prisma.platformSkill.findMany({
        where: { robotId },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ skills });
    }

    // Otherwise require user authentication
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    // Verify robot belongs to tenant
    const robot = await prisma.robot.findFirst({
      where: { id: robotId, tenantId: auth.tenantId },
    });

    if (!robot) {
      throw new ApiError(404, "not_found", "Robot not found.");
    }

    const skills = await prisma.platformSkill.findMany({
      where: { robotId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ skills });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id: robotId } = await params;

    // Verify robot belongs to tenant
    const robot = await prisma.robot.findFirst({
      where: { id: robotId, tenantId: auth.tenantId },
    });

    if (!robot) {
      throw new ApiError(404, "not_found", "Robot not found.");
    }

    const contentType = request.headers.get("content-type") || "";

    let name: string;
    let description: string | undefined;
    let skillMd: string;
    let scripts: Array<{ path: string; content: string }> | undefined;

    if (contentType.includes("multipart/form-data")) {
      // Handle ZIP upload
      const formData = await request.formData();
      const zipFile = formData.get("file") as File | null;

      name = formData.get("name") as string;
      description = formData.get("description") as string | undefined;

      if (!name) {
        throw new ApiError(400, "validation_error", "Skill name is required.");
      }

      if (!zipFile) {
        throw new ApiError(400, "validation_error", "ZIP file is required.");
      }

      // Extract ZIP content
      const arrayBuffer = await zipFile.arrayBuffer();
      const zip = new AdmZip(Buffer.from(arrayBuffer));

      // Look for SKILL.md (at root or in subdirectory)
      const entries = zip.getEntries();
      const skillEntry = entries.find(
        (e) => e.entryName.endsWith("SKILL.md") && !e.isDirectory
      );

      if (!skillEntry) {
        throw new ApiError(
          400,
          "validation_error",
          "ZIP must contain a SKILL.md file."
        );
      }

      skillMd = skillEntry.getData().toString("utf8");

      // Extract scripts from scripts/ directory (at root or in subdirectories like pdf/scripts/)
      const scriptEntries = entries.filter(
        (e) => e.entryName.includes("/scripts/") && !e.isDirectory
      );

      if (scriptEntries.length > 0) {
        scripts = scriptEntries.map((entry) => {
          // Extract path relative to scripts/ directory
          const match = entry.entryName.match(/^(.+?\/scripts\/)/);
          const relativePath = match ? entry.entryName.slice(match[1].length) : entry.entryName;
          return {
            path: relativePath,
            content: entry.getData().toString("utf8"),
          };
        });
      }
    } else {
      // Handle JSON payload
      const body = await request.json();
      name = body.name;
      description = body.description;
      skillMd = body.skillMd;

      if (!name) {
        throw new ApiError(400, "validation_error", "Skill name is required.");
      }
      if (!skillMd) {
        throw new ApiError(
          400,
          "validation_error",
          "Skill markdown content is required."
        );
      }
    }

    // Validate name format (alphanumeric with dashes/underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new ApiError(
        400,
        "validation_error",
        "Skill name must be alphanumeric with dashes/underscores only."
      );
    }

    // Check for duplicate skill name
    const existing = await prisma.platformSkill.findUnique({
      where: { robotId_name: { robotId, name } },
    });

    if (existing) {
      throw new ApiError(
        409,
        "conflict",
        `Skill "${name}" already exists for this robot.`
      );
    }

    const skill = await prisma.platformSkill.create({
      data: {
        robotId,
        name,
        description,
        skillMd,
        scripts: scripts || undefined,
      },
    });

    // Publish sync_skills event to robot
    await publishToRobot(robotId, {
      type: "sync_skills",
      action: "created",
      skillId: skill.id,
      skillName: skill.name,
    });

    return NextResponse.json({ skill }, { status: 201 });
  } catch (err) {
    // Don't double-handle FormData parse errors
    if (err instanceof Error && err.message.includes("FormData")) {
      return handleError(err);
    }
    return handleError(err);
  }
}
