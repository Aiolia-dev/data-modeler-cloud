import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";

// PATCH /api/projects/[id]/members/[memberId] - Update a project member's role
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const projectId = params.id;
    const memberId = params.memberId;
    const { role, access } = await request.json();

    // Validate input
    if (!role || !['viewer', 'editor', 'owner'].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'viewer', 'editor', or 'owner'." },
        { status: 400 }
      );
    }

    // Get the current user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication error" },
        { status: 401 }
      );
    }

    // Check if the user is a superuser
    const isSuperuser = user.user_metadata?.is_superuser === "true";
    
    if (!isSuperuser) {
      return NextResponse.json(
        { error: "Only superusers can modify project member roles" },
        { status: 403 }
      );
    }

    // Use admin client to update the project member
    const adminClient = await createAdminClient();
    
    // Log the update operation for debugging
    console.log(`Updating project member ${memberId} in project ${projectId} to role: ${role}`);
    
    // First, check if the member exists
    // Note: memberId is actually the user_id, not the record id
    const { data: existingMember, error: findError } = await adminClient
      .from("project_members")
      .select("*")
      .eq("user_id", memberId)
      .eq("project_id", projectId)
      .single();
      
    if (findError) {
      console.error("Error finding project member:", findError);
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }
    
    // Get the user's email using the admin client's auth API
    const { data: userData, error: userLookupError } = await adminClient.auth.admin.getUserById(memberId);
      
    if (userLookupError) {
      console.error("Error finding user email:", userLookupError);
      // Continue anyway, we'll just update the role without the email
    }
    
    const userEmail = userData?.user?.email;
    console.log(`Found email for user ${memberId}:`, userEmail);
    
    // Now update the member's role and email if available
    // Make sure role is one of the allowed values
    const roleValue = role as 'viewer' | 'editor' | 'owner';
    
    // Create the update object
    const updateData: { 
      role: 'viewer' | 'editor' | 'owner'; 
      email?: string 
    } = { role: roleValue };
    
    // Only add email to update if we found it
    if (userEmail) {
      updateData.email = userEmail;
    }
    
    const { data, error } = await adminClient
      .from("project_members")
      .update(updateData)
      .eq("user_id", memberId)
      .eq("project_id", projectId)
      .select();
      
    // Log the updated data for debugging
    console.log('Updated member data:', data);

    if (error) {
      console.error("Error updating project member:", error);
      return NextResponse.json(
        { error: "Failed to update project member" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: "Project member updated successfully",
      member: data[0]
    });
  } catch (error) {
    console.error("Error in PATCH /api/projects/[id]/members/[memberId]:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/members/[memberId] - Remove a project member
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const projectId = params.id;
    const memberId = params.memberId;

    // Get the current user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication error" },
        { status: 401 }
      );
    }

    // Check if the user is a superuser
    const isSuperuser = user.user_metadata?.is_superuser === "true";
    
    if (!isSuperuser) {
      return NextResponse.json(
        { error: "Only superusers can remove project members" },
        { status: 403 }
      );
    }

    // Use admin client to delete the project member
    const adminClient = await createAdminClient();
    
    // Log the delete operation for debugging
    console.log(`Removing project member ${memberId} from project ${projectId}`);
    
    // Delete the member
    const { error } = await adminClient
      .from("project_members")
      .delete()
      .eq("user_id", memberId)
      .eq("project_id", projectId);
      
    if (error) {
      console.error("Error removing project member:", error);
      return NextResponse.json(
        { error: "Failed to remove project member" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: "Project member removed successfully"
    });
  } catch (error) {
    console.error("Error in DELETE /api/projects/[id]/members/[memberId]:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
