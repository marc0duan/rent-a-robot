import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signUserToken } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone } = body;

    if (!email || !password || !name) {
      throw new ApiError(400, "validation_error", "Email, password, and name are required.");
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, "user_exists", "A user with this email already exists.");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        phone: phone || null,
        passwordHash,
      },
    });

    // Generate token (no tenant context yet)
    const token = signUserToken({ userId: user.id, email: user.email });

    return NextResponse.json(
      {
        user: { id: user.id, email: user.email, name: user.name },
        token,
      },
      { status: 201 }
    );
  } catch (err) {
    return handleError(err);
  }
}
