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

    const robots = await prisma.robot.findMany({
      where: { tenantId: auth.tenantId },
      select: {
        id: true,
        name: true,
        status: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ robots, total: robots.length });
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
    const { name, soulMd } = body;

    if (!name) {
      throw new ApiError(400, "validation_error", "Robot name is required.");
    }

    const sanitizedName = sanitizeString(name);

    // Validate name format (1-2 words, alphanumeric) for @mention compatibility
    if (!/^\w+(?:\s\w+)?$/.test(sanitizedName)) {
      throw new ApiError(
        400,
        "validation_error",
        "Robot name must be 1-2 words (alphanumeric) for @mention compatibility"
      );
    }
    const sanitizedSoulMd = sanitizeString(soulMd || '');

    const robot = await prisma.robot.create({
      data: {
        name: sanitizedName,
        tenantId: auth.tenantId,
        createdById: auth.userId,
        soulMd: sanitizedSoulMd,
        status: "created",
      },
    });

    return NextResponse.json({ robot }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
