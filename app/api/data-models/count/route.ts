import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Use your server createClient method which handles cookies properly
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
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    // Get admin client to access data with service role
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!adminKey || !supabaseUrl) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create admin client that bypasses RLS
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminSupabase = createAdminClient(supabaseUrl, adminKey);

    // Count all data models in the database
    const { count, error } = await adminSupabase
      .from('data_models')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error("Error counting data models:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Return the count
    return NextResponse.json({
      count: count || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Unexpected error counting data models:", error);
    return NextResponse.json(
      {
        error: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
