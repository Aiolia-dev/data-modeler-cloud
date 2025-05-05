import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: { id: string; modelId: string } }
) {
  // Use Promise.resolve to properly await the params object
  const { id, modelId } = await Promise.resolve(params);
  const projectId = id;
  console.log(`GET /api/projects/${projectId}/models/${modelId}/entities - Fetching entities`);
  
  try {
    const supabase = await createClient();
    
    // Get the current user
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
    
    console.log('User authenticated:', user.id);
    
    // Use admin client to bypass RLS
    const adminClient = createAdminClient();
    
    // Get entities for this data model
    const { data: entities, error } = await adminClient
      .from('entities')
      .select('*')
      .eq('data_model_id', modelId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching entities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch entities', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ entities });
  } catch (error) {
    console.error('Error in GET /api/projects/[id]/models/[modelId]/entities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string; modelId: string } }
) {
  // Use Promise.resolve to properly await the params object
  const { id, modelId } = await Promise.resolve(params);
  const projectId = id;
  console.log(`POST /api/projects/${projectId}/models/${modelId}/entities - Creating a new entity`);
  
  try {
    const supabase = await createClient();
    
    // Get the current user
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
    
    console.log('User authenticated:', user.id);
    
    // Get request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('Error parsing request body:', jsonError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { name, description, primaryKeyType, primaryKeyName } = body;
    
    if (!name) {
      console.error('Entity name is required');
      return NextResponse.json(
        { error: 'Entity name is required' },
        { status: 400 }
      );
    }
    
    // Verify that the data model exists
    const adminClient = createAdminClient();
    
    // Check if data model exists
    const { data: dataModel, error: dataModelError } = await adminClient
      .from('data_models')
      .select('*')
      .eq('id', modelId)
      .single();
    
    if (dataModelError) {
      console.error('Error fetching data model:', dataModelError);
      return NextResponse.json(
        { error: 'Data model not found', details: dataModelError.message },
        { status: 404 }
      );
    }
    
    console.log('Creating entity:', { name, description, data_model_id: modelId, created_by: user.id });
    
    // Create the entity using the admin client
    const { data: entity, error: entityError } = await adminClient
      .from('entities')
      .insert({
        name,
        description: description || null,
        data_model_id: modelId,
        created_by: user.id
      })
      .select()
      .single();
    
    if (entityError) {
      console.error('Error creating entity:', entityError);
      return NextResponse.json(
        { error: 'Failed to create entity', details: entityError.message },
        { status: 500 }
      );
    }
    
    console.log('Entity created successfully:', entity);
    
    // If we have primary key info, create the primary key attribute
    if (primaryKeyType && primaryKeyName) {
      const dataType = primaryKeyType === 'uuid' ? 'uuid' : 'integer';
      
      console.log('Creating primary key attribute:', { 
        name: primaryKeyName, 
        data_type: dataType, 
        entity_id: entity.id 
      });
      
      const { error: attributeError } = await adminClient
        .from('attributes')
        .insert({
          name: primaryKeyName,
          description: 'Primary key',
          data_type: dataType,
          is_required: true,
          is_unique: true,
          is_primary_key: true,
          entity_id: entity.id,
          created_by: user.id,
        });

      if (attributeError) {
        console.error('Error creating primary key attribute:', attributeError);
        // We don't fail the whole request if just the attribute creation fails
      } else {
        console.log('Primary key attribute created successfully');
      }
    }

    return NextResponse.json({ entity });
  } catch (error) {
    console.error('Error in POST /api/projects/[id]/models/[modelId]/entities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
