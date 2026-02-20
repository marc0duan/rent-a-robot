import { NextRequest, NextResponse } from "next/server";

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Robot-Token, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

export function middleware(request: NextRequest) {
  const { method, nextUrl } = request;
  const path = nextUrl.pathname;
  const start = Date.now();

  if (method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const response = NextResponse.next();

  if (path.startsWith("/api/")) {
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      response.headers.set(key, value);
    }
  }

  if (path.startsWith("/api/") && path !== "/api/health") {
    const duration = Date.now() - start;
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const ua = request.headers.get("user-agent") ?? "";

    console.log(
      JSON.stringify({
        type: "request",
        method,
        path,
        duration_ms: duration,
        ip,
        ua: ua.substring(0, 200),
        timestamp: new Date().toISOString(),
      })
    );
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
