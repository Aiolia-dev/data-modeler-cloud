import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createMiddlewareClient } from "@/utils/supabase/fixed-client";
import { checkRateLimit, applyRateLimitHeaders, createRateLimitExceededResponse } from "@/utils/rate-limit";

// Security check validation
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitInfo = checkRateLimit(request);

  if (rateLimitInfo.limited) {
    return createRateLimitExceededResponse(rateLimitInfo);
  }

  try {
    // Parse the request body
    const body = await request.json();
    const { code } = body;

    // Get the access code from environment variables
    const accessCode = process.env.ACCESS_CODE;

    if (!accessCode) {
      console.error("ACCESS_CODE environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Validate the code
    if (code !== accessCode) {
      return NextResponse.json(
        { error: "Invalid security code" },
        { status: 401 }
      );
    }

    // If the code is valid, set a cookie to remember the successful validation
    // This cookie will expire after 5 minutes (300 seconds)
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    // Set a secure HTTP-only cookie
    response.cookies.set({
      name: "security_check_passed",
      value: "true",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300, // 5 minutes
      path: "/",
    });

    // Apply rate limit headers
    applyRateLimitHeaders(response, rateLimitInfo);

    return response;
  } catch (error) {
    console.error("Error in security check:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
