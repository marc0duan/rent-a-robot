import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { requireAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { phone, code } = body;

    if (!phone || !code) {
      throw new ApiError(400, "validation_error", "Phone number and verification code are required.");
    }

    // Check verification code from Redis
    const storedCode = await redis.get(`phone_verify:${phone}`);
    if (!storedCode || storedCode !== code) {
      throw new ApiError(400, "invalid_code", "Invalid or expired verification code.");
    }

    // Clean up
    await redis.del(`phone_verify:${phone}`);

    // TODO: Update user phone if not already set
    // For now, just return success
    return NextResponse.json({
      verified: true,
      message: "Phone number verified successfully.",
    });
  } catch (err) {
    return handleError(err);
  }
}
