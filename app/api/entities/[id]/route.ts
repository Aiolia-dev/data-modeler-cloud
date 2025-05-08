import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getEntityRole, isMethodAllowedForRole, UserRole } from '@/middleware/role-check';

// GET endpoint to fetch a single entity by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: entityId } = await params;
    console.log(`[GET /api/entities/${entityId}] Fetching entity...`);
    
    // Get authenticated user info for logging
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log(`[GET /api/entities/${entityId}] User:`, user?.email, `(${user?.id})`, `Is superuser:`, user?.user_metadata?.is_superuser);
    
    if (!entityId) {
      console.error(`[GET /api/entities/${entityId}] No entity ID provided.`);
      return NextResponse.json({ error: 'Entity ID is required' }, { status: 400 });
    }
    
    // Get the data model ID from the URL search params
    const url = new URL(request.url);
    const dataModelId = url.searchParams.get('dataModelId');
    console.log(`[GET /api/entities/${entityId}] Data model ID from params:`, dataModelId);
    
    // Check user's role for this entity
    console.log(`[GET /api/entities/${entityId}] Checking user role for entity...`);
    const { role, error: roleError } = await getEntityRole(entityId);
    console.log(`[GET /api/entities/${entityId}] Role check result:`, { role, error: roleError });
    
    if (roleError) {
      console.error(`[GET /api/entities/${entityId}] Role check error:`, roleError);
      return NextResponse.json({ error: roleError }, { status: 403 });
    }
    
    // Check if the user's role allows GET requests
    console.log(`[GET /api/entities/${entityId}] Checking if method GET is allowed for role ${role}...`);
    const isAllowed = isMethodAllowedForRole('GET', role);
    console.log(`[GET /api/entities/${entityId}] Method allowed:`, isAllowed);
    
    if (!isAllowed) {
      console.error(`[GET /api/entities/${entityId}] User with role ${role} not allowed to perform GET`);
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Use admin client to bypass RLS
    console.log(`[GET /api/entities/${entityId}] Creating admin client to bypass RLS...`);
    const adminClient = createAdminClient();
    
    // Build the query based on whether dataModelId is provided
    console.log(`[GET /api/entities/${entityId}] Building query...`);
    let query = adminClient
      .from('entities')
      .select('*')
      .eq('id', entityId);
      
    // Add data_model_id filter if provided
    if (dataModelId) {
      console.log(`[GET /api/entities/${entityId}] Adding data_model_id filter: ${dataModelId}`);
      query = query.eq('data_model_id', dataModelId);
    }
    
    // Execute the query
    console.log(`[GET /api/entities/${entityId}] Executing query...`);
    let entity;
    let queryError;
    
    try {
      const result = await query.single();
      entity = result.data;
      queryError = result.error;
      console.log(`[GET /api/entities/${entityId}] Query result:`, { 
        entity: entity ? 'Found' : 'Not found', 
        error: queryError ? queryError.message : 'None' 
      });
    } catch (error) {
      console.error(`[GET /api/entities/${entityId}] Query execution error:`, error);
      return NextResponse.json({ 
        error: 'Error executing query', 
        details: error instanceof Error ? error.message : String(error) 
      }, { status: 500 });
    }

    if (queryError) {
      console.error(`[GET /api/entities/${entityId}] Error fetching entity:`, queryError.message, queryError);
      return NextResponse.json({ error: 'Failed to fetch entity', details: queryError.message }, { status: 404 });
    }

    if (!entity) {
      console.warn(`[GET /api/entities/${entityId}] No entity found with this ID and data model ID.`);
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }

    console.log(`[GET /api/entities/${entityId}] Entity fetched successfully:`, entity);
    return NextResponse.json({ entity });
  } catch (error) {
    console.error(`Error in GET /api/entities/[id]:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update entity properties (including position)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: entityId } = await params;
    console.log(`PATCH /api/entities/${entityId} - Updating entity`);
    
    if (!entityId) {
      console.error('Entity ID is required');
      return NextResponse.json(
        { error: 'Entity ID is required' },
        { status: 400 }
      );
    }
    
    // Check user's role for this entity
    const { role, error: roleError } = await getEntityRole(entityId);
    
    if (roleError) {
      console.error(`PATCH /api/entities/${entityId} - Role check error:`, roleError);
      return NextResponse.json({ error: roleError }, { status: 403 });
    }
    
    // Check if the user's role allows PATCH requests
    if (!isMethodAllowedForRole('PATCH', role)) {
      console.error(`PATCH /api/entities/${entityId} - User with role ${role} not allowed to perform PATCH`);
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        { error: 'Authentication error', details: userError.message },
        { status: 401 }
      );
    }
    
    if (!user) {
      console.error('No user found');
      return NextResponse.json(
        { error: 'Unauthorized - No user found' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    console.log('Request body:', body);
    
    // Create admin client to bypass RLS
    const adminClient = createAdminClient();
    
    // First verify the entity exists
    const { data: entity, error: entityError } = await adminClient
      .from('entities')
      .select('id, data_model_id')
      .eq('id', entityId)
      .single();
      
    if (entityError) {
      console.error('Error verifying entity:', entityError);
      return NextResponse.json(
        { error: 'Entity not found', details: entityError.message },
        { status: 404 }
      );
    }
    
    // Prepare update data
    const updateData: Record<string, any> = {};
    
    // Handle position update
    if (body.position_x !== undefined) updateData.position_x = body.position_x;
    if (body.position_y !== undefined) updateData.position_y = body.position_y;
    
    // Handle name update
    if (body.name !== undefined) updateData.name = body.name;
    
    // Handle description update
    if (body.description !== undefined) updateData.description = body.description;
    
    // Handle color update
    if (body.color !== undefined) updateData.color = body.color;
    
    // Handle is_view update
    if (body.is_view !== undefined) {
      updateData.is_view = body.is_view;
      
      // If changing to a view, check if we need to update the SQL definition
      if (body.is_view === true && body.sql_definition !== undefined) {
        updateData.sql_definition = body.sql_definition;
        
        // If this is a view and we're updating the SQL, check if we need to update the attributes
        if (body.attributes !== undefined) {
          // First, delete all existing attributes for this entity
          const { error: deleteAttributesError } = await adminClient
            .from('attributes')
            .delete()
            .eq('entity_id', entityId);
          
          if (deleteAttributesError) {
            console.error('Error deleting existing attributes:', deleteAttributesError);
            // Continue with the update anyway, but log the error
          }
        }
      }
    }
    
    // Handle new schema columns
    if (body.entity_type !== undefined) updateData.entity_type = body.entity_type;
    if (body.join_entities !== undefined) updateData.join_entities = body.join_entities;
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString();
    
    console.log('Updating entity with data:', updateData);
    
    // Update the entity
    const { data: updatedEntity, error: updateError } = await adminClient
      .from('entities')
      .update(updateData)
      .eq('id', entityId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating entity:', updateError);
      return NextResponse.json(
        { error: `Failed to update entity: ${updateError.message}` },
        { status: 500 }
      );
    }
    
    console.log('Entity updated successfully:', updatedEntity);
    return NextResponse.json({ entity: updatedEntity });
  } catch (error) {
    console.error(`Error in PATCH /api/entities/[id]:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete an entity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: entityId } = await params;
    console.log(`DELETE /api/entities/${entityId} - Deleting entity`);
    
    if (!entityId) {
      console.error('Entity ID is required');
      return NextResponse.json(
        { error: 'Entity ID is required' },
        { status: 400 }
      );
    }
    
    // Check user's role for this entity
    const { role, error: roleError } = await getEntityRole(entityId);
    
    if (roleError) {
      console.error(`DELETE /api/entities/${entityId} - Role check error:`, roleError);
      return NextResponse.json({ error: roleError }, { status: 403 });
    }
    
    // Check if the user's role allows DELETE requests
    if (!isMethodAllowedForRole('DELETE', role)) {
      console.error(`DELETE /api/entities/${entityId} - User with role ${role} not allowed to perform DELETE`);
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        { error: 'Authentication error', details: userError.message },
        { status: 401 }
      );
    }
    
    if (!user) {
      console.error('No user found');
      return NextResponse.json(
        { error: 'Unauthorized - No user found' },
        { status: 401 }
      );
    }
    
    // Create admin client to bypass RLS
    const adminClient = createAdminClient();
    
    // First verify the entity exists
    const { data: entity, error: entityError } = await adminClient
      .from('entities')
      .select('id')
      .eq('id', entityId)
      .single();
      
    if (entityError) {
      console.error('Error verifying entity:', entityError);
      return NextResponse.json(
        { error: 'Entity not found', details: entityError.message },
        { status: 404 }
      );
    }
    
    // Delete the entity
    const { error: deleteError } = await adminClient
      .from('entities')
      .delete()
      .eq('id', entityId);
    
    if (deleteError) {
      console.error('Error deleting entity:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete entity: ${deleteError.message}` },
        { status: 500 }
      );
    }
    
    console.log('Entity deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error in DELETE /api/entities/[id]:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
