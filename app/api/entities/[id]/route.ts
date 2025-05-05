import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getEntityRole, isMethodAllowedForRole, UserRole } from '@/middleware/role-check';

// GET endpoint to fetch a single entity by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const entityId = params.id;
  console.log(`[GET /api/entities/${entityId}] Fetching entity...`);
  
  if (!entityId) {
    console.error(`[GET /api/entities/${entityId}] No entity ID provided.`);
    return NextResponse.json({ error: 'Entity ID is required' }, { status: 400 });
  }
  
  // Get the data model ID from the URL search params
  const url = new URL(request.url);
  const dataModelId = url.searchParams.get('dataModelId');
  console.log(`[GET /api/entities/${entityId}] Data model ID from params:`, dataModelId);
  
  // Check user's role for this entity
  const { role, error: roleError } = await getEntityRole(entityId);
  
  if (roleError) {
    console.error(`[GET /api/entities/${entityId}] Role check error:`, roleError);
    return NextResponse.json({ error: roleError }, { status: 403 });
  }
  
  // Check if the user's role allows GET requests
  if (!isMethodAllowedForRole('GET', role)) {
    console.error(`[GET /api/entities/${entityId}] User with role ${role} not allowed to perform GET`);
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Use admin client to bypass RLS
  const adminClient = createAdminClient();
  
  // Build the query based on whether dataModelId is provided
  let query = adminClient
    .from('entities')
    .select('*')
    .eq('id', entityId);
    
  // Add data_model_id filter if provided
  if (dataModelId) {
    query = query.eq('data_model_id', dataModelId);
  }
  
  // Execute the query
  const { data: entity, error } = await query.single();

  if (error) {
    console.error(`[GET /api/entities/${entityId}] Error fetching entity:`, error.message, error);
    return NextResponse.json({ error: 'Failed to fetch entity', details: error.message }, { status: 404 });
  }

  if (!entity) {
    console.warn(`[GET /api/entities/${entityId}] No entity found with this ID and data model ID.`);
    return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
  }

  console.log(`[GET /api/entities/${entityId}] Entity fetched successfully:`, entity);
  return NextResponse.json({ entity });
}

// PATCH endpoint to update entity properties (including position)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`PATCH /api/entities/${params.id} - Updating entity`);
  
  try {
    // Get entity ID from params
    const entityId = params.id;
    
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
    
    // Get request body
    let body;
    try {
      body = await request.json();
      console.log('Request body:', body);
    } catch (jsonError) {
      console.error('Error parsing request body:', jsonError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
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
    
    // Prepare update data - convert camelCase to snake_case
    const updateData: any = {};
    
    // Only allow specific fields to be updated
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.position_x !== undefined) updateData.position_x = body.position_x;
    if (body.position_y !== undefined) updateData.position_y = body.position_y;
    
    // Handle referential_id field
    if (body.referential_id !== undefined) {
      console.log('Updating referential_id to:', body.referential_id);
      
      // If referential_id is provided but null or empty string, set to null
      // Otherwise use the provided value
      updateData.referential_id = body.referential_id === '' ? null : body.referential_id;
      
      // Validate referential_id if it's not null
      if (updateData.referential_id) {
        try {
          // Verify the referential exists
          const { data: refData, error: refError } = await adminClient
            .from('referentials')
            .select('id')
            .eq('id', updateData.referential_id)
            .single();
            
          if (refError) {
            console.error('Invalid referential_id:', updateData.referential_id, refError);
            // Continue with the update anyway, but log the error
          }
        } catch (refCheckError) {
          console.error('Error checking referential:', refCheckError);
          // Continue with the update anyway, but log the error
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
    console.error(`Error in PATCH /api/entities/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete an entity
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`DELETE /api/entities/${params.id} - Deleting entity`);
  
  try {
    // Get entity ID from params
    const entityId = params.id;
    
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
    console.error(`Error in DELETE /api/entities/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
