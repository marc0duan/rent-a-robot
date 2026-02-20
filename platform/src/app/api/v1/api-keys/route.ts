import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { applyRateLimit } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/sanitize";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    if (auth.role !== "admin" && auth.role !== "owner") {
      throw new ApiError(403, "forbidden", "Only admins and owners can manage API keys.");
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { tenantId: auth.tenantId },
      select: {
        id: true,
        label: true,
        level: true,
        tenantId: true,
        userId: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ apiKeys });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenantAuth(request);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    if (auth.role !== "admin" && auth.role !== "owner") {
      throw new ApiError(403, "forbidden", "Only admins and owners can manage API keys.");
    }

    const body = await request.json();
    const { label, level, expiresIn } = body;

    if (!label || typeof label !== "string") {
      throw new ApiError(400, "validation_error", "Label is required.");
    }

    const sanitizedLabel = sanitizeString(label);

    if (level !== "tenant" && level !== "user") {
      throw new ApiError(400, "validation_error", 'Level must be "tenant" or "user".');
    }

    // Generate plaintext key
    const plainKey = `pk_${crypto.randomUUID().replace(/-/g, "")}`;

    // Hash for storage
    const keyHash = await bcrypt.hash(plainKey, 10);

    // Calculate expiration
    let expiresAt: Date | undefined;
    if (expiresIn && typeof expiresIn === "string") {
      const match = expiresIn.match(/^(\d+)(d|m|y)$/);
      if (match) {
        const amount = parseInt(match[1], 10);
        const unit = match[2];
        expiresAt = new Date();
        if (unit === "d") expiresAt.setDate(expiresAt.getDate() + amount);
        if (unit === "m") expiresAt.setMonth(expiresAt.getMonth() + amount);
        if (unit === "y") expiresAt.setFullYear(expiresAt.getFullYear() + amount);
      }
    }

    const apiKey = await prisma.apiKey.create({
      data: {
        keyHash,
        label: sanitizedLabel,
        level,
        tenantId: auth.tenantId,
        userId: level === "user" ? auth.userId : null,
        expiresAt: expiresAt ?? null,
      },
    });

    return NextResponse.json(
      {
        apiKey: {
          id: apiKey.id,
          label: apiKey.label,
          key: plainKey, // Only shown once
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return handleError(err);
  }
}
