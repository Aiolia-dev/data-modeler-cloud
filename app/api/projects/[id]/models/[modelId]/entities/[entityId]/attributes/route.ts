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

    console.log(`Fetching attributes for entity ${entityId}`);

    // Use admin client to bypass RLS policies
    const adminSupabase = createAdminClient();
    
    // Get attributes for this entity
    const { data: attributes, error } = await adminSupabase
      .from("attributes")
      .select("*")
      .eq("entity_id", entityId)
      .order("is_primary_key", { ascending: false })
      .order("created_at", { ascending: true });
      
    console.log('Fetched attributes:', attributes);

    if (error) {
      console.error("Error fetching attributes:", error);
      return NextResponse.json(
        { error: "Failed to fetch attributes" },
        { status: 500 }
      );
    }

    return NextResponse.json({ attributes });
  } catch (error) {
    console.error("Error in GET /api/projects/[id]/models/[modelId]/entities/[entityId]/attributes:", error);
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
    const attributes = body.attributes || [];

    if (!Array.isArray(attributes)) {
      return NextResponse.json(
        { error: "Attributes must be an array" },
        { status: 400 }
      );
    }

    console.log(`Updating attributes for entity ${entityId}`);

    // Use admin client to bypass RLS policies
    const adminSupabase = createAdminClient();
    
    // Get existing attributes
    const { data: existingAttributes, error: fetchError } = await adminSupabase
      .from("attributes")
      .select("id")
      .eq("entity_id", entityId);

    if (fetchError) {
      console.error("Error fetching existing attributes:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch existing attributes" },
        { status: 500 }
      );
    }

    const existingIds = existingAttributes?.map(attr => attr.id) || [];
    const updatedIds = attributes.filter(attr => attr.id).map(attr => attr.id);
    
    // Attributes to delete (exist in DB but not in the updated list)
    const idsToDelete = existingIds.filter(id => !updatedIds.includes(id));
    
    // Delete attributes that are no longer in the list
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await adminSupabase
        .from("attributes")
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        console.error("Error deleting attributes:", deleteError);
        return NextResponse.json(
          { error: "Failed to delete attributes" },
          { status: 500 }
        );
      }
    }

    // Update or insert attributes
    for (const attribute of attributes) {
      if (attribute.id) {
        // Update existing attribute - only include fields that exist in the database
        const { error: updateError } = await adminSupabase
          .from("attributes")
          .update({
            name: attribute.name,
            description: attribute.description,
            data_type: attribute.data_type,
            length: attribute.length,
            is_required: attribute.is_required,
            is_unique: attribute.is_unique,
            default_value: attribute.default_value,
            is_primary_key: attribute.is_primary_key,
            is_foreign_key: attribute.is_foreign_key,
            updated_at: new Date().toISOString(),
          })
          .eq("id", attribute.id);

        if (updateError) {
          console.error(`Error updating attribute ${attribute.id}:`, updateError);
          return NextResponse.json(
            { error: `Failed to update attribute ${attribute.name}` },
            { status: 500 }
          );
        }
      } else {
        // Insert new attribute - only include fields that exist in the database
        const { error: insertError } = await adminSupabase
          .from("attributes")
          .insert({
            name: attribute.name,
            description: attribute.description,
            data_type: attribute.data_type,
            length: attribute.length,
            is_required: attribute.is_required,
            is_unique: attribute.is_unique,
            default_value: attribute.default_value,
            is_primary_key: attribute.is_primary_key,
            is_foreign_key: attribute.is_foreign_key,
            entity_id: entityId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`Error inserting attribute ${attribute.name}:`, insertError);
          return NextResponse.json(
            { error: `Failed to create attribute ${attribute.name}` },
            { status: 500 }
          );
        }
      }
    }

    // Get updated attributes
    const { data: updatedAttributes, error: getUpdatedError } = await adminSupabase
      .from("attributes")
      .select("*")
      .eq("entity_id", entityId)
      .order("is_primary_key", { ascending: false })
      .order("created_at", { ascending: true });

    if (getUpdatedError) {
      console.error("Error fetching updated attributes:", getUpdatedError);
      return NextResponse.json(
        { error: "Attributes were updated but failed to fetch the updated list" },
        { status: 500 }
      );
    }

    return NextResponse.json({ attributes: updatedAttributes });
  } catch (error) {
    console.error("Error in PUT /api/projects/[id]/models/[modelId]/entities/[entityId]/attributes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
