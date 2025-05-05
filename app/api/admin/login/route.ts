import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Use Supabase's server-side authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error:", error.message);
      return NextResponse.json(
        { message: error.message, error: error },
        { status: 401 }
      );
    }

    // Successfully authenticated
    return NextResponse.json({
      user: data.user,
      message: "Successfully logged in",
      session: data.session ? {
        expires_at: data.session.expires_at,
        token_type: data.session.token_type,
      } : null,
    });
  } catch (error: any) {
    console.error("Unexpected error in login:", error);
    return NextResponse.json(
      { message: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
