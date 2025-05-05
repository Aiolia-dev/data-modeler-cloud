import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Get credentials from body
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Important: Only allow this in development environment or for specific emails
    if (process.env.NODE_ENV !== 'development' && 
        !email.endsWith('@outscale.com')) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 }
      );
    }
    
    // Create a fake user object with superuser privileges for emergency access
    // This is a fallback when normal authentication fails
    const user = {
      id: "emergency-auth-user",
      email: email,
      user_metadata: {
        is_superuser: "true",
        emergency_access: true,
        access_method: "force-auth"
      },
      app_metadata: {},
      created_at: new Date().toISOString()
    };

    return NextResponse.json({
      user,
      message: "Emergency access granted",
    });
  } catch (error: any) {
    console.error("Force auth error:", error);
    return NextResponse.json(
      { message: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
