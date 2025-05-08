import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // First check if current user has permission (is already a superuser or is the same user)
    const { data, error: authError } = await supabase.auth.getSession();
    const session = data.session;
    const user = session?.user;
    
    if (authError || !session || !user) {
      return NextResponse.json(
        { message: "Authentication required", error: authError },
        { status: 401 }
      );
    }

    // Create an admin client that bypasses RLS
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!adminKey || !supabaseUrl) {
      return NextResponse.json(
        { message: "Server configuration error" },
        { status: 500 }
      );
    }
    
    // Import dynamically to avoid bundling issues
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminSupabase = createAdminClient(supabaseUrl, adminKey);

    // Update user metadata to add superuser flag
    const { data: updateData, error: updateError } = await adminSupabase.auth.admin.updateUserById(
      userId,
      { 
        user_metadata: { 
          is_superuser: "true" 
        }
      }
    );

    if (updateError) {
      console.error("Error setting superuser:", updateError);
      return NextResponse.json(
        { message: updateError.message, error: updateError },
        { status: 500 }
      );
    }

    // Successfully updated user
    return NextResponse.json({
      message: "Superuser status set successfully",
      user: updateData.user
    });
  } catch (error: any) {
    console.error("Unexpected error setting superuser:", error);
    return NextResponse.json(
      { message: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
