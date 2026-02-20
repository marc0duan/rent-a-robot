import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        gender: true,
        jobTitle: true,
        workLocation: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: { code: "not_found", message: "User not found." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { name, avatar, gender, jobTitle, workLocation } = body;

    const data: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof avatar === "string") data.avatar = avatar || null;
    if (typeof gender === "string") data.gender = gender || null;
    if (typeof jobTitle === "string") data.jobTitle = jobTitle || null;
    if (typeof workLocation === "string") data.workLocation = workLocation || null;

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        gender: true,
        jobTitle: true,
        workLocation: true,
      },
    });

    return NextResponse.json({ user });
  } catch (err) {
    return handleError(err);
  }
}
