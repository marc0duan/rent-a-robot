import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

// GET /api/health - Health check
export async function GET() {
  const checks: Record<string, string> = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "connected";
  } catch {
    checks.database = "disconnected";
    checks.status = "degraded";
  }

  // Check Redis
  try {
    await redis.ping();
    checks.redis = "connected";
  } catch {
    checks.redis = "disconnected";
    checks.status = "degraded";
  }

  const statusCode = checks.status === "ok" ? 200 : 503;

  return NextResponse.json(checks, { status: statusCode });
}
