import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";

// GET /api/v1/robots - List robots in tenant
export async function GET(request: NextRequest) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

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

// POST /api/v1/robots - Register a new robot
export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { name, soulMd } = body;

    if (!name || !soulMd) {
      throw new ApiError(400, "validation_error", "Robot name and soulMd are required.");
    }

    const robot = await prisma.robot.create({
      data: {
        name,
        tenantId: auth.tenantId,
        createdById: auth.userId,
        soulMd,
        status: "created",
      },
    });

    return NextResponse.json({ robot }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
