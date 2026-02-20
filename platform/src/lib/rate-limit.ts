import { NextRequest } from "next/server";
import { redis } from "./redis";
import { ApiError } from "./errors";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export interface RateLimitConfig {
  key: string;
  limit: number;
  window: number;
}

export const RATE_LIMITS = {
  user: { limit: 1000, window: 3600 },
  robot: { limit: 5000, window: 3600 },
  apiKey: { limit: 2000, window: 3600 },
  unauthenticated: { limit: 100, window: 3600 },
  invitation: { limit: 50, window: 3600 },
} as const;

export function getRateLimitKey(
  type: "user" | "robot" | "api-key" | "ip" | "invitation",
  identifier: string
): string {
  return `rl:${type}:${identifier}`;
}

export async function rateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const { key, limit, window } = config;
  const now = Date.now();
  const windowStart = now - window * 1000;
  const resetAt = Math.ceil((now + window * 1000) / 1000);

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, now, `${now}:${Math.random().toString(36).slice(2)}`);
  pipeline.zcard(key);
  pipeline.expire(key, window);

  const results = await pipeline.exec();

  const count = (results?.[2]?.[1] as number) ?? 0;
  const remaining = Math.max(0, limit - count);
  const success = count <= limit;

  return { success, remaining, reset: resetAt };
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function applyRateLimit(
  request: NextRequest,
  type: "user" | "robot" | "api-key" | "ip" | "invitation",
  identifier?: string
): Promise<void> {
  const id = identifier ?? getClientIp(request);
  const key = getRateLimitKey(type, id);
  const config = type === "robot"
    ? RATE_LIMITS.robot
    : type === "api-key"
      ? RATE_LIMITS.apiKey
      : type === "invitation"
        ? RATE_LIMITS.invitation
        : type === "user"
          ? RATE_LIMITS.user
          : RATE_LIMITS.unauthenticated;

  const result = await rateLimit({ key, ...config });

  if (!result.success) {
    throw new ApiError(429, "rate_limit_exceeded", "Too many requests. Please try again later.", {
      retryAfter: result.reset,
      remaining: result.remaining,
    });
  }
}
