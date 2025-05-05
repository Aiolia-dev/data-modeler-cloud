import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; roleId: string } }
) {
  try {
    const projectId = params.id;
    const roleId = params.roleId;
    
    if (!projectId || !roleId) {
      return NextResponse.json(
        { error: "Project ID and role ID are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    
    // Delete the validation role assignment
    const { error } = await supabase
      .from("user_validation_roles")
      .delete()
      .eq("id", roleId)
      .eq("project_id", projectId);
    
    if (error) {
      console.error("Error deleting validation role:", error);
      return NextResponse.json(
        { error: "Failed to delete validation role" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in delete validation role API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string; roleId: string } }
) {
  try {
    const projectId = params.id;
    const roleId = params.roleId;
    
    if (!projectId || !roleId) {
      return NextResponse.json(
        { error: "Project ID and role ID are required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { validation_role_id, component_scope } = body;

    if (!validation_role_id) {
      return NextResponse.json(
        { error: "Validation role ID is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    
    // Update the validation role assignment
    const { data, error } = await supabase
      .from("user_validation_roles")
      .update({
        validation_role_id,
        component_scope,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roleId)
      .eq("project_id", projectId)
      .select();
    
    if (error) {
      console.error("Error updating validation role:", error);
      return NextResponse.json(
        { error: "Failed to update validation role" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, role: data[0] });
  } catch (error) {
    console.error("Unexpected error in update validation role API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
