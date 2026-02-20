import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/errors";
import { validateInvitation } from "@/services/invitation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "Token is required." } },
        { status: 400 }
      );
    }

    const result = await validateInvitation(token);

    if (!result.valid) {
      return NextResponse.json(
        { error: { code: "invalid_invitation", message: result.error } },
        { status: 400 }
      );
    }

    return NextResponse.json({ invitation: result.invitation });
  } catch (err) {
    return handleError(err);
  }
}
