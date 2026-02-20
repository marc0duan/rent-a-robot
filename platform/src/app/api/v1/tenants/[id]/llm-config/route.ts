import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";
import { encrypt, decrypt, maskApiKey } from "@/lib/crypto";
import { sanitizeString } from "@/lib/sanitize";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, ["owner", "admin"]);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id } = await params;

    if (id !== auth.tenantId) {
      throw new ApiError(403, "forbidden", "You can only access your own tenant's configuration.");
    }

    const config = await prisma.tenantLlmConfig.findUnique({
      where: { tenantId: id },
    });

    if (!config) {
      return NextResponse.json({ llmConfig: null });
    }

    return NextResponse.json({
      llmConfig: {
        id: config.id,
        tenantId: config.tenantId,
        provider: config.provider,
        apiKeyMasked: maskApiKey(decrypt(config.apiKeyEnc)),
        baseUrl: config.baseUrl,
        model: config.model,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, ["owner", "admin"]);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id } = await params;

    if (id !== auth.tenantId) {
      throw new ApiError(403, "forbidden", "You can only modify your own tenant's configuration.");
    }

    const body = await request.json();
    const { provider, apiKey, baseUrl, model } = body;

    if (!provider || !apiKey) {
      throw new ApiError(400, "validation_error", "Provider and apiKey are required.");
    }

    const allowedProviders = [
      "openai", "anthropic", "deepseek", "openrouter",
      "dashscope", "moonshot", "zhipu", "minimax", "custom",
    ];
    if (!allowedProviders.includes(provider)) {
      throw new ApiError(400, "validation_error", `Invalid provider. Must be one of: ${allowedProviders.join(", ")}`);
    }

    const sanitizedProvider = sanitizeString(provider);
    const sanitizedBaseUrl = baseUrl ? sanitizeString(baseUrl) : null;
    const sanitizedModel = model ? sanitizeString(model) : null;

    const apiKeyEnc = encrypt(apiKey);

    const config = await prisma.tenantLlmConfig.upsert({
      where: { tenantId: id },
      update: {
        provider: sanitizedProvider,
        apiKeyEnc,
        baseUrl: sanitizedBaseUrl,
        model: sanitizedModel,
      },
      create: {
        tenantId: id,
        provider: sanitizedProvider,
        apiKeyEnc,
        baseUrl: sanitizedBaseUrl,
        model: sanitizedModel,
      },
    });

    return NextResponse.json({
      llmConfig: {
        id: config.id,
        tenantId: config.tenantId,
        provider: config.provider,
        apiKeyMasked: maskApiKey(apiKey),
        baseUrl: config.baseUrl,
        model: config.model,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, ["owner", "admin"]);
    if (auth instanceof NextResponse) return auth;

    await applyRateLimit(request, "user", auth.userId);

    const { id } = await params;

    if (id !== auth.tenantId) {
      throw new ApiError(403, "forbidden", "You can only modify your own tenant's configuration.");
    }

    const existing = await prisma.tenantLlmConfig.findUnique({
      where: { tenantId: id },
    });

    if (!existing) {
      throw new ApiError(404, "not_found", "No LLM configuration found for this tenant.");
    }

    await prisma.tenantLlmConfig.delete({ where: { tenantId: id } });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
