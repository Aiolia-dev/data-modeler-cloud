import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    
    // Fetch validation roles for this project with user details and role details
    const { data: userValidationRoles, error } = await supabase
      .from("user_validation_roles")
      .select(`
        id, 
        user_id,
        validation_role_id,
        data_model_id,
        component_scope,
        created_at,
        updated_at,
        validation_roles:validation_role_id (id, name, description),
        users:user_id (id, email)
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching validation roles:", error);
      return NextResponse.json(
        { error: "Failed to fetch validation roles" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ userValidationRoles });
  } catch (error) {
    console.error("Unexpected error in validation roles API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { user_id, validation_role_id, component_scope } = body;

    if (!user_id || !validation_role_id) {
      return NextResponse.json(
        { error: "User ID and validation role ID are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    
    // Check if this user already has this role for this project
    const { data: existingRole } = await supabase
      .from("user_validation_roles")
      .select("id")
      .eq("user_id", user_id)
      .eq("validation_role_id", validation_role_id)
      .eq("project_id", projectId)
      .maybeSingle();

    if (existingRole) {
      return NextResponse.json(
        { error: "This user already has this validation role for this project" },
        { status: 400 }
      );
    }

    // Insert new validation role assignment
    const { data, error } = await supabase
      .from("user_validation_roles")
      .insert({
        user_id,
        validation_role_id,
        project_id: projectId,
        component_scope,
      })
      .select();

    if (error) {
      console.error("Error assigning validation role:", error);
      return NextResponse.json(
        { error: "Failed to assign validation role" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, role: data[0] });
  } catch (error) {
    console.error("Unexpected error in validation roles API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
