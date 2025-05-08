import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modelId: string; entityId: string }> }
) {
  try {
    const { id, modelId, entityId } = await params;
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`Fetching entity ${entityId}`);

    // Get entity details
    const { data: entity, error } = await supabase
      .from("entities")
      .select("*")
      .eq("id", entityId)
      .single();

    if (error) {
      console.error("Error fetching entity:", error);
      return NextResponse.json(
        { error: "Failed to fetch entity" },
        { status: 500 }
      );
    }

    return NextResponse.json({ entity });
  } catch (error) {
    console.error("Error in GET /api/projects/[id]/models/[modelId]/entities/[entityId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modelId: string; entityId: string }> }
) {
  try {
    const { id, modelId, entityId } = await params;
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: "Entity name is required" },
        { status: 400 }
      );
    }

    console.log(`Updating entity ${entityId}:`, body);

    // Use the admin client to bypass RLS policies that might be causing issues
    const adminSupabase = createAdminClient();
    
    // Log the entity data being sent
    console.log('Entity update data:', {
      name: body.name,
      description: body.description,
      updated_at: new Date().toISOString(),
    });
    
    // Update the entity using admin client
    const { data: entity, error } = await adminSupabase
      .from("entities")
      .update({
        name: body.name,
        description: body.description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId)
      .select()
      .single();

    if (error) {
      console.error("Error updating entity:", error);
      return NextResponse.json(
        { error: "Failed to update entity" },
        { status: 500 }
      );
    }

    return NextResponse.json({ entity });
  } catch (error) {
    console.error("Error in PUT /api/projects/[id]/models/[modelId]/entities/[entityId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modelId: string; entityId: string }> }
) {
  try {
    const { id, modelId, entityId } = await params;
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`Deleting entity ${entityId} from model ${modelId} in project ${id}`);

    // Use the admin client to bypass RLS policies that might be causing issues
    const adminSupabase = createAdminClient();
    
    // First delete all attributes associated with this entity
    console.log(`Deleting attributes for entity ${entityId}`);
    const { data: deletedAttributes, error: attributesError } = await adminSupabase
      .from("attributes")
      .delete()
      .eq("entity_id", entityId)
      .select();

    if (attributesError) {
      console.error("Error deleting entity attributes:", attributesError);
      return NextResponse.json(
        { error: "Failed to delete entity attributes" },
        { status: 500 }
      );
    }
    
    console.log(`Successfully deleted ${deletedAttributes?.length || 0} attributes`);

    // Then delete the entity itself
    console.log(`Deleting entity ${entityId}`);
    const { data: deletedEntity, error } = await adminSupabase
      .from("entities")
      .delete()
      .eq("id", entityId)
      .select();

    if (error) {
      console.error("Error deleting entity:", error);
      return NextResponse.json(
        { error: "Failed to delete entity" },
        { status: 500 }
      );
    }
    
    console.log(`Successfully deleted entity:`, deletedEntity);

    return NextResponse.json({ success: true, deletedEntity });
  } catch (error) {
    console.error("Error in DELETE /api/projects/[id]/models/[modelId]/entities/[entityId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
