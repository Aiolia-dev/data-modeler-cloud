import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET endpoint to fetch all data models across all projects
 * This endpoint is restricted to superusers only
 */
export async function GET(request: Request) {
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

    // Fetch all data models from the database
    const { data: dataModels, error } = await adminSupabase
      .from('data_models')
      .select('*');

    if (error) {
      console.error("Error fetching all data models:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Return all data models
    return NextResponse.json({
      dataModels: dataModels || [],
      count: dataModels?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Unexpected error fetching all data models:", error);
    return NextResponse.json(
      {
        error: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
