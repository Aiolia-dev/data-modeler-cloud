import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET endpoint to fetch API traffic by endpoint
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

    // Get the search params (limit)
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '6', 10);

    // Try to get top API endpoints by request count
    let data;
    let error;
    
    try {
      // First attempt: Use a raw SQL query via RPC function
      const result = await adminSupabase.rpc(
        'get_endpoint_counts',
        { limit_val: limit }
      );
      data = result.data;
      error = result.error;
    } catch (e) {
      // If the RPC function doesn't exist, try a direct query
      try {
        // Second attempt: Try using a direct count query
        const result = await adminSupabase
          .from('api_requests')
          .select('path, count')
          .order('count', { ascending: false })
          .limit(limit);
        data = result.data;
        error = result.error;
      } catch (e2) {
        // If that fails too, we'll handle it in the error block below
        error = e2;
      }
    }

    if (error) {
      console.error("Error fetching API endpoints:", error);
      
      // Fallback to a simpler query if the group by fails
      const { data: allRequests, error: fallbackError } = await adminSupabase
        .from('api_requests')
        .select('path');
        
      if (fallbackError) {
        console.error("Error with fallback query:", fallbackError);
        return NextResponse.json({ endpoints: [] });
      }
      
      // Manually count occurrences
      const counts: Record<string, number> = {};
      allRequests?.forEach((item: { path: string }) => {
        counts[item.path] = (counts[item.path] || 0) + 1;
      });
      
      // Convert to array and sort
      const result = Object.entries(counts)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
        
      return NextResponse.json({ endpoints: result });
    }

    // Define type for the endpoint data item
    interface EndpointItem {
      path: string;
      count: string;
    }
    
    // Format the response
    const endpoints = data.map((item: EndpointItem) => ({
      path: item.path,
      count: parseInt(item.count, 10)
    }));

    return NextResponse.json({ endpoints });
  } catch (error: any) {
    console.error("Unexpected error fetching API endpoints:", error);
    return NextResponse.json(
      {
        error: error.message || "An unexpected error occurred",
        endpoints: []
      },
      { status: 500 }
    );
  }
}
