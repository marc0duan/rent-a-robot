import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { requireAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";
import { sendSmsCode } from "@/lib/sms";

function generateCode(): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const body = await request.json();
    const { phone } = body;

    if (!phone || typeof phone !== "string") {
      throw new ApiError(400, "validation_error", "Phone number is required.");
    }

    // Basic phone number validation (E.164 format)
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    if (!phoneRegex.test(phone)) {
      throw new ApiError(400, "validation_error", "Invalid phone number format.");
    }

    // Rate limit per phone number: max 5 codes per hour
    const phoneRlKey = `rl:sms:${phone}`;
    const phoneSendCount = await redis.incr(phoneRlKey);
    if (phoneSendCount === 1) {
      await redis.expire(phoneRlKey, 3600);
    }
    if (phoneSendCount > 5) {
      throw new ApiError(429, "rate_limit_exceeded", "Too many verification codes requested for this phone number. Try again later.");
    }

    // Generate 6-digit code and store in Redis with 5-minute TTL
    const code = generateCode();
    await redis.set(`phone_verify:${phone}`, code, "EX", 300);

    // Send SMS via Aliyun
    await sendSmsCode(phone, code);

    return NextResponse.json({
      sent: true,
      message: "Verification code sent successfully.",
    });
  } catch (err) {
    return handleError(err);
  }
}
