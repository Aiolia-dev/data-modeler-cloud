import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        { error: 'Authentication error', details: userError?.message },
        { status: 401 }
      );
    }

    const referentialId = params.id;

    if (!referentialId) {
      return NextResponse.json(
        { error: "Referential ID is required" },
        { status: 400 }
      )
    }
    
    // Use the admin client to bypass RLS policies
    console.log('Using admin client to fetch referential');
    const adminClient = await createAdminClient();
    
    const { data: referential, error } = await adminClient
      .from("referentials" as any)
      .select("*")
      .eq("id", referentialId)
      .single();
      
    console.log('Referential fetch result:', { referential, error: error?.message });

    if (error) {
      console.error("Error fetching referential:", error)
      return NextResponse.json(
        { error: "Failed to fetch referential" },
        { status: 500 }
      )
    }

    return NextResponse.json({ referential })
  } catch (error) {
    console.error("Error in referential GET route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Add PUT method that calls the PATCH method for compatibility
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Forward to PATCH handler
  return PATCH(request, { params });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== PATCH /api/referentials/[id] - Updating a referential ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));
  console.log('Referential ID:', params.id);
  
  try {
    // Get request body first to avoid any auth issues if the body is invalid
    let body;
    try {
      body = await request.json();
      console.log('Request body:', JSON.stringify(body, null, 2));
    } catch (jsonError) {
      console.error('Error parsing request body:', jsonError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    // Extract fields from the request body
    const { name, description, color, entityIds } = body;
    const referentialId = params.id;
    
    if (!referentialId) {
      console.error('Referential ID is required');
      return NextResponse.json(
        { error: 'Referential ID is required' },
        { status: 400 }
      );
    }
    
    if (!name) {
      console.error('Referential name is required');
      return NextResponse.json(
        { error: 'Referential name is required' },
        { status: 400 }
      );
    }
    
    // Get the current user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        { error: 'Authentication error', details: userError?.message },
        { status: 401 }
      );
    }
    
    // Create the admin client early to use for all database operations
    console.log('Creating admin client...');
    const adminClient = await createAdminClient();
    console.log('Admin client created successfully');
    
    // First, check if the referential exists
    console.log('Checking if referential exists:', referentialId);
    const { data: existingReferential, error: fetchError } = await adminClient
      .from('referentials' as any)
      .select('*')
      .eq('id', referentialId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching referential:', fetchError);
      return NextResponse.json(
        { error: 'Referential not found', details: fetchError.message },
        { status: 404 }
      );
    }
    
    console.log('Existing referential found:', existingReferential);
    
    // Update the referential
    console.log('Updating referential with data:', {
      name,
      description: description || null,
      color: color || existingReferential.color || '#6366F1',
    });
    
    const { data: updatedReferential, error: updateError } = await adminClient
      .from('referentials' as any)
      .update({
        name,
        description: description || null,
        color: color || existingReferential.color || '#6366F1',
        updated_at: new Date().toISOString()
      })
      .eq('id', referentialId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating referential:', updateError);
      return NextResponse.json(
        { error: 'Failed to update referential', details: updateError.message },
        { status: 500 }
      );
    }
    
    console.log('Referential updated successfully:', updatedReferential);
    
    // Handle entity associations
    if (entityIds !== undefined) {
      try {
        // First, clear any existing associations for this referential
        console.log(`Clearing existing entity associations for referential ${referentialId}`);
        const { error: clearError } = await adminClient
          .from('entities')
          .update({ referential_id: null })
          .eq('referential_id', referentialId);
          
        if (clearError) {
          console.error('Error clearing existing entity associations:', clearError);
          // Continue anyway
        } else {
          console.log('Successfully cleared existing entity associations');
        }
        
        // Then, if there are new entityIds, set those associations
        if (Array.isArray(entityIds) && entityIds.length > 0) {
          console.log(`Setting ${entityIds.length} new entity associations for referential ${referentialId}`);
          const { error: updateError } = await adminClient
            .from('entities')
            .update({ referential_id: referentialId })
            .in('id', entityIds);
            
          if (updateError) {
            console.error('Error setting new entity associations:', updateError);
          } else {
            console.log('Successfully set new entity associations');
          }
        } else {
          console.log('No new entity associations to set');
        }
      } catch (entityUpdateError) {
        console.error('Exception during entity association updates:', entityUpdateError);
        // Continue anyway
      }
    } else {
      console.log('No entityIds provided, skipping entity association updates');
    }
    
    return NextResponse.json({ referential: updatedReferential });
    
  } catch (error: any) {
    console.error("Error in referentials PATCH route:", error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== DELETE /api/referentials/[id] - Deleting a referential ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  console.log('Referential ID:', params.id);
  
  try {
    const referentialId = params.id;
    
    if (!referentialId) {
      console.error('Referential ID is required');
      return NextResponse.json(
        { error: 'Referential ID is required' },
        { status: 400 }
      );
    }
    
    // Get the current user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        { error: 'Authentication error', details: userError?.message },
        { status: 401 }
      );
    }
    
    // Create the admin client
    console.log('Creating admin client...');
    const adminClient = await createAdminClient();
    console.log('Admin client created successfully');
    
    // First, check if the referential exists
    console.log('Checking if referential exists:', referentialId);
    const { data: existingReferential, error: fetchError } = await adminClient
      .from('referentials' as any)
      .select('*')
      .eq('id', referentialId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching referential:', fetchError);
      return NextResponse.json(
        { error: 'Referential not found', details: fetchError.message },
        { status: 404 }
      );
    }
    
    console.log('Existing referential found:', existingReferential);
    
    // Before deleting the referential, update all entities that reference it
    console.log('Updating entities to remove referential association');
    const { data: entities, error: entitiesError } = await adminClient
      .from('entities')
      .select('id')
      .eq('referential_id', referentialId);
    
    if (entitiesError) {
      console.error('Error fetching entities with referential:', entitiesError);
      // Continue with deletion anyway
    } else if (entities && entities.length > 0) {
      console.log(`Found ${entities.length} entities with this referential, updating them`);
      
      const { error: updateError } = await adminClient
        .from('entities')
        .update({ referential_id: null })
        .eq('referential_id', referentialId);
      
      if (updateError) {
        console.error('Error updating entities:', updateError);
        // Continue with deletion anyway
      } else {
        console.log('Entities updated successfully');
      }
    } else {
      console.log('No entities found with this referential');
    }
    
    // Delete the referential
    console.log('Deleting referential:', referentialId);
    const { error: deleteError } = await adminClient
      .from('referentials' as any)
      .delete()
      .eq('id', referentialId);
    
    if (deleteError) {
      console.error('Error deleting referential:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete referential', details: deleteError.message },
        { status: 500 }
      );
    }
    
    console.log('Referential deleted successfully');
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error("Error in referentials DELETE route:", error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
