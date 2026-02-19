import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorResponse(error: ApiError): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    },
    { status: error.statusCode }
  );
}

export function handleError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return errorResponse(err);
  }

  console.error("Unhandled error:", err);
  return NextResponse.json(
    {
      error: {
        code: "internal_error",
        message: "An unexpected error occurred.",
      },
    },
    { status: 500 }
  );
}
