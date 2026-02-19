import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me";

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface TenantAuthPayload extends AuthPayload {
  tenantId: string;
  role: string;
}

export interface RobotAuthPayload {
  robotId: string;
  robotName: string;
  creatorId: string;
  tenantId: string;
  teamIds: string[];
}

// Sign a JWT for human users
export function signUserToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// Sign a JWT with tenant context
export function signTenantToken(payload: TenantAuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// Sign a long-lived robot token
export function signRobotToken(
  payload: RobotAuthPayload,
  expiresIn?: string
): string {
  const options: jwt.SignOptions = {};
  if (expiresIn) options.expiresIn = expiresIn as StringValue;
  return jwt.sign(payload, JWT_SECRET, options);
}

// Verify any JWT
export function verifyToken<T>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}

// Extract Bearer token from Authorization header
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

// Middleware: require authenticated user (no tenant context)
export async function requireAuth(
  request: NextRequest
): Promise<AuthPayload | NextResponse> {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Missing authentication token." } },
      { status: 401 }
    );
  }

  try {
    const payload = verifyToken<AuthPayload>(token);
    return payload;
  } catch {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Invalid or expired token." } },
      { status: 401 }
    );
  }
}

// Middleware: require authenticated user with tenant context
export async function requireTenantAuth(
  request: NextRequest
): Promise<TenantAuthPayload | NextResponse> {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Missing authentication token." } },
      { status: 401 }
    );
  }

  try {
    const payload = verifyToken<TenantAuthPayload>(token);
    if (!payload.tenantId) {
      return NextResponse.json(
        { error: { code: "no_tenant_context", message: "Token does not contain tenant context. Use /api/v1/auth/select-tenant first." } },
        { status: 403 }
      );
    }
    return payload;
  } catch {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Invalid or expired token." } },
      { status: 401 }
    );
  }
}

// Middleware: require specific role(s)
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<TenantAuthPayload | NextResponse> {
  const result = await requireTenantAuth(request);
  if (result instanceof NextResponse) return result;

  if (!allowedRoles.includes(result.role)) {
    return NextResponse.json(
      { error: { code: "forbidden", message: `Requires one of roles: ${allowedRoles.join(", ")}` } },
      { status: 403 }
    );
  }

  return result;
}

// Middleware: require robot token (X-Robot-Token header)
export async function requireRobotAuth(
  request: NextRequest
): Promise<RobotAuthPayload | NextResponse> {
  const robotToken = request.headers.get("x-robot-token");
  if (!robotToken) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Missing X-Robot-Token header." } },
      { status: 401 }
    );
  }

  try {
    const payload = verifyToken<RobotAuthPayload>(robotToken);

    // Verify robot still exists and token hasn't been revoked
    const robot = await prisma.robot.findUnique({
      where: { id: payload.robotId },
    });

    if (!robot || robot.status === "created") {
      return NextResponse.json(
        { error: { code: "unauthorized", message: "Robot token is invalid or revoked." } },
        { status: 401 }
      );
    }

    return payload;
  } catch {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Invalid or expired robot token." } },
      { status: 401 }
    );
  }
}

// Middleware: require API key (X-API-Key header)
export async function requireApiKey(
  request: NextRequest
): Promise<{ tenantId: string | null; userId: string | null; level: string } | NextResponse> {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Missing X-API-Key header." } },
      { status: 401 }
    );
  }

  // Hash the key and look it up
  const bcrypt = await import("bcryptjs");
  const keys = await prisma.apiKey.findMany();

  for (const key of keys) {
    const match = await bcrypt.compare(apiKey, key.keyHash);
    if (match) {
      if (key.expiresAt && key.expiresAt < new Date()) {
        return NextResponse.json(
          { error: { code: "unauthorized", message: "API key has expired." } },
          { status: 401 }
        );
      }
      return { tenantId: key.tenantId, userId: key.userId, level: key.level };
    }
  }

  return NextResponse.json(
    { error: { code: "unauthorized", message: "Invalid API key." } },
    { status: 401 }
  );
}
