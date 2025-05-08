import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// Define the attribute database structure
interface Attribute {
  id: string;
  entity_id: string;
  name: string;
  data_type: string;
  description?: string;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  is_unique: boolean;
  is_mandatory: boolean;
  is_calculated: boolean;
  referenced_entity_id?: string;
  created_at: string;
  updated_at: string;
}

// Define the expected request body structure
interface UpdateAttributeRequest {
  name?: string;
  description?: string;
  dataType?: string;
  isRequired?: boolean;
  isUnique?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  defaultValue?: string | null;
  length?: number | null;
  minLength?: number | null;
  formatValidation?: string | null;
  searchable?: boolean;
  caseSensitive?: boolean;
  indexable?: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: attributeId } = await params;
    
    if (!attributeId) {
      return NextResponse.json(
        { error: "Attribute ID is required" },
        { status: 400 }
      );
    }

    console.log(`Fetching attribute with ID: ${attributeId}`);

    // Use admin client to bypass RLS policies
    const adminSupabase = createAdminClient();
    
    // Get the attribute
    const { data, error } = await adminSupabase
      .from("attributes")
      .select("*")
      .eq("id", attributeId)
      .single();

    if (error) {
      console.error("Error fetching attribute:", error);
      return NextResponse.json(
        { error: "Failed to fetch attribute" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Attribute not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/attributes/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: attributeId } = await params;
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
    
    if (!attributeId) {
      return NextResponse.json(
        { error: "Attribute ID is required" },
        { status: 400 }
      );
    }

    // Parse the request body
    const body = await request.json() as UpdateAttributeRequest;
    
    console.log(`Updating attribute with ID: ${attributeId}`, body);

    // Prepare the update data - only include fields that are provided
    const updateData: Record<string, any> = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.dataType !== undefined) updateData.data_type = body.dataType;
    if (body.isRequired !== undefined) updateData.is_required = body.isRequired;
    if (body.isUnique !== undefined) updateData.is_unique = body.isUnique;
    if (body.isPrimaryKey !== undefined) updateData.is_primary_key = body.isPrimaryKey;
    if (body.isForeignKey !== undefined) updateData.is_foreign_key = body.isForeignKey;
    if (body.defaultValue !== undefined) updateData.default_value = body.defaultValue;
    if (body.length !== undefined) updateData.length = body.length;
    
    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    // Use admin client to bypass RLS policies
    const adminSupabase = createAdminClient();
    
    // Update the attribute
    const { data, error } = await adminSupabase
      .from("attributes")
      .update(updateData)
      .eq("id", attributeId)
      .select();

    if (error) {
      console.error("Error updating attribute:", error);
      return NextResponse.json(
        { error: "Failed to update attribute" },
        { status: 500 }
      );
    }

    return NextResponse.json({ attribute: data[0], success: true });
  } catch (error) {
    console.error("Error in PUT /api/attributes/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: attributeId } = await params;
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
    
    if (!attributeId) {
      return NextResponse.json(
        { error: "Attribute ID is required" },
        { status: 400 }
      );
    }

    console.log(`Deleting attribute with ID: ${attributeId}`);

    // Use admin client to bypass RLS policies
    const adminSupabase = createAdminClient();
    
    // First, check if this attribute is a foreign key
    const { data: attributeData, error: fetchError } = await adminSupabase
      .from("attributes")
      .select("is_foreign_key, referenced_entity_id, entity_id")
      .eq("id", attributeId)
      .single<Pick<Attribute, 'is_foreign_key' | 'referenced_entity_id' | 'entity_id'>>();
    
    if (fetchError) {
      console.error("Error fetching attribute:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch attribute information" },
        { status: 500 }
      );
    }
    
    // If this is a foreign key with a referenced entity, we need to delete any relationship entries
    if (attributeData && attributeData.is_foreign_key && attributeData.referenced_entity_id) {
      console.log(`Attribute ${attributeId} is a foreign key referencing entity ${attributeData.referenced_entity_id}`);
      
      // Try to find and delete the relationship
      // The relationship could be in either direction (source->target or target->source)
      const { data: relationshipData, error: relFetchError } = await adminSupabase
        .from("relationships")
        .select("id")
        .or(`source_entity_id.eq.${attributeData.entity_id},target_entity_id.eq.${attributeData.entity_id}`)
        .or(`source_entity_id.eq.${attributeData.referenced_entity_id},target_entity_id.eq.${attributeData.referenced_entity_id}`)
        .limit(1)
        .returns<{ id: string }[]>();
        
      if (!relFetchError && relationshipData && relationshipData.length > 0) {
        console.log(`Deleting relationship with ID: ${relationshipData[0].id}`);
        
        // Delete the relationship
        const { error: relDeleteError } = await adminSupabase
          .from("relationships")
          .delete()
          .eq("id", relationshipData[0].id);
          
        if (relDeleteError) {
          console.error("Error deleting relationship:", relDeleteError);
          // Continue with attribute deletion even if relationship deletion fails
        } else {
          console.log(`Successfully deleted relationship ${relationshipData[0].id}`);
        }
      }
    }
    
    // Now delete the attribute
    const { error } = await adminSupabase
      .from("attributes")
      .delete()
      .eq("id", attributeId);

    if (error) {
      console.error("Error deleting attribute:", error);
      return NextResponse.json(
        { error: "Failed to delete attribute" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/attributes/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
