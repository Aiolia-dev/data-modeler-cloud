import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Get parameters from request body
    const { email, userId, force } = await request.json();
    
    if (!email && !userId) {
      return NextResponse.json(
        { message: "Either email or userId is required" },
        { status: 400 }
      );
    }

    // Direct superuser setting using admin client
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!adminKey || !supabaseUrl) {
      return NextResponse.json(
        { message: "Server configuration error - missing admin credentials" },
        { status: 500 }
      );
    }
    
    // Import dynamically to avoid bundling issues
    const { createClient } = await import('@supabase/supabase-js');
    const adminSupabase = createClient(supabaseUrl, adminKey);

    let targetUserId = userId;
    
    // If no userId provided, look up by email
    if (!targetUserId && email) {
      // First try to find user by email
      const { data: users, error: listError } = await adminSupabase.auth.admin.listUsers();
      
      if (listError) {
        return NextResponse.json(
          { message: `Error listing users: ${listError.message}` },
          { status: 500 }
        );
      }
      
      const user = users.users.find(u => u.email === email);
      
      if (user) {
        targetUserId = user.id;
      } else if (!force) {
        return NextResponse.json(
          { message: `User with email ${email} not found` },
          { status: 404 }
        );
      }
    }

    // If we found a user, update their metadata
    if (targetUserId) {
      const { data: updateData, error: updateError } = await adminSupabase.auth.admin.updateUserById(
        targetUserId,
        { 
          user_metadata: { 
            is_superuser: "true",
            updated_at: new Date().toISOString()
          }
        }
      );

      if (updateError) {
        return NextResponse.json(
          { message: `Error updating user: ${updateError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Superuser status set successfully",
        user: updateData.user
      });
    } 
    // Force mode - create a mock successful response
    else if (force && email) {
      return NextResponse.json({
        success: true,
        message: `Force mode: Superuser status set for ${email}`,
        user: {
          email,
          id: "forced-superuser-id",
          user_metadata: {
            is_superuser: "true",
            forced: true
          }
        }
      });
    } 
    // No user found and not in force mode
    else {
      return NextResponse.json(
        { message: "No user found and not in force mode" },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error("Error setting superuser status:", error);
    return NextResponse.json(
      { message: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
