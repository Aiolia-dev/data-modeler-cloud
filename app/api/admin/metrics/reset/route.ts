import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

/**
 * DELETE endpoint to reset API request logs
 * This endpoint is restricted to superusers only
 */
export async function DELETE(request: Request) {
  try {
    // Use server createClient method which handles cookies properly
    const supabase = await createClient();

    // Get current session and user to verify admin access
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!session || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify the user is a superuser
    if (user.user_metadata?.is_superuser !== "true") {
      return NextResponse.json(
        { error: "Not authorized - Superuser access required" },
        { status: 403 }
      );
    }

    // Get admin client to bypass RLS
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!adminKey || !supabaseUrl) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create admin client with service role key
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminSupabase = createAdminClient(supabaseUrl, adminKey);

    // Delete all records from the api_requests table
    const { error } = await adminSupabase
      .from('api_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // This is a trick to delete all records

    if (error) {
      console.error("Error resetting API requests:", error);
      return NextResponse.json(
        { error: "Failed to reset API requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "API request logs have been reset"
    });
  } catch (error: any) {
    console.error("Unexpected error resetting API requests:", error);
    return NextResponse.json(
      {
        error: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
