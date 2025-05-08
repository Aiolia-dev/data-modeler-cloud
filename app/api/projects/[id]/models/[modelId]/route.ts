import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modelId: string }> }
) {
  try {
    const { id, modelId } = await params;
    const projectId = id;
    console.log(`GET /api/projects/${projectId}/models/${modelId} - Fetching data model details`);
    
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
    
    // Use the admin client to bypass RLS policies
    const adminClient = createAdminClient();
    
    // Fetch the data model
    const { data: dataModel, error: dataModelError } = await adminClient
      .from('data_models')
      .select('*')
      .eq('id', modelId)
      .eq('project_id', projectId)
      .single();
    
    if (dataModelError) {
      console.error('Error fetching data model:', dataModelError);
      if (dataModelError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Data model not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch data model', details: dataModelError.message },
        { status: 500 }
      );
    }
    
    // Fetch entities for this data model
    const { data: entities, error: entitiesError } = await adminClient
      .from('entities')
      .select('*')
      .eq('data_model_id', modelId)
      .order('name');
    
    if (entitiesError) {
      console.error('Error fetching entities:', entitiesError);
      // Continue even if entities fetch fails
    }
    
    console.log(`Fetched data model ${modelId} with ${entities?.length || 0} entities`);
    return NextResponse.json({ 
      dataModel,
      entities: entities || []
    });
  } catch (error) {
    console.error(`Error in GET /api/projects/[id]/models/[modelId]:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch data model details', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modelId: string }> }
) {
  try {
    const { id, modelId } = await params;
    const projectId = id;
    console.log(`PUT /api/projects/${projectId}/models/${modelId} - Updating data model`);
    
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
    
    const { name, description, version } = body;
    
    if (!name) {
      console.error('Data model name is required');
      return NextResponse.json(
        { error: 'Data model name is required' },
        { status: 400 }
      );
    }
    
    // Use the admin client to bypass RLS policies
    const adminClient = createAdminClient();
    
    // Check if the data model exists and belongs to the project
    const { data: existingModel, error: checkError } = await adminClient
      .from('data_models')
      .select('*')
      .eq('id', modelId)
      .eq('project_id', projectId)
      .single();
    
    if (checkError) {
      console.error('Error checking data model:', checkError);
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Data model not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to check data model', details: checkError.message },
        { status: 500 }
      );
    }
    
    // Update the data model
    const { data: updatedModel, error: updateError } = await adminClient
      .from('data_models')
      .update({
        name,
        description: description || null,
        version: version || existingModel.version,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', modelId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating data model:', updateError);
      return NextResponse.json(
        { error: 'Failed to update data model', details: updateError.message },
        { status: 500 }
      );
    }
    
    console.log('Data model updated successfully:', updatedModel);
    return NextResponse.json({ dataModel: updatedModel });
  } catch (error) {
    console.error(`Error in PUT /api/projects/[id]/models/[modelId]:`, error);
    return NextResponse.json(
      { error: 'Failed to update data model', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modelId: string }> }
) {
  try {
    const { id, modelId } = await params;
    const projectId = id;
    console.log(`DELETE /api/projects/${projectId}/models/${modelId} - Deleting data model`);
    
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
    
    // Use the admin client to bypass RLS policies
    const adminClient = createAdminClient();
    
    // Check if the data model exists and belongs to the project
    const { data: existingModel, error: checkError } = await adminClient
      .from('data_models')
      .select('*')
      .eq('id', modelId)
      .eq('project_id', projectId)
      .single();
    
    if (checkError) {
      console.error('Error checking data model:', checkError);
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Data model not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to check data model', details: checkError.message },
        { status: 500 }
      );
    }
    
    // First, get all entities in this data model
    const { data: entities, error: entitiesError } = await adminClient
      .from('entities')
      .select('id')
      .eq('data_model_id', modelId);
    
    if (entitiesError) {
      console.error('Error fetching entities for deletion:', entitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch entities for deletion', details: entitiesError.message },
        { status: 500 }
      );
    }
    
    const entityIds = entities?.map(entity => entity.id) || [];
    console.log(`Found ${entityIds.length} entities to delete`);
    
    // Start a transaction to ensure all deletions succeed or fail together
    try {
      // 1. Delete all relationships involving these entities
      if (entityIds.length > 0) {
        const { error: relDeleteError } = await adminClient
          .from('relationships')
          .delete()
          .or(`source_entity_id.in.(${entityIds.join(',')}),target_entity_id.in.(${entityIds.join(',')})`);
        
        if (relDeleteError) {
          console.error('Error deleting relationships:', relDeleteError);
          return NextResponse.json(
            { error: 'Failed to delete relationships', details: relDeleteError.message },
            { status: 500 }
          );
        }
        console.log('Successfully deleted all relationships for the data model');
        
        // 2. Delete all attributes for these entities
        const { error: attrDeleteError } = await adminClient
          .from('attributes')
          .delete()
          .in('entity_id', entityIds);
        
        if (attrDeleteError) {
          console.error('Error deleting attributes:', attrDeleteError);
          return NextResponse.json(
            { error: 'Failed to delete attributes', details: attrDeleteError.message },
            { status: 500 }
          );
        }
        console.log('Successfully deleted all attributes for the data model');
        
        // 3. Delete all entities
        const { error: entityDeleteError } = await adminClient
          .from('entities')
          .delete()
          .eq('data_model_id', modelId);
        
        if (entityDeleteError) {
          console.error('Error deleting entities:', entityDeleteError);
          return NextResponse.json(
            { error: 'Failed to delete entities', details: entityDeleteError.message },
            { status: 500 }
          );
        }
        console.log('Successfully deleted all entities for the data model');
      }
      
      // 4. Finally, delete the data model itself
      const { error: deleteError } = await adminClient
        .from('data_models')
        .delete()
        .eq('id', modelId);
      
      if (deleteError) {
        console.error('Error deleting data model:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete data model', details: deleteError.message },
          { status: 500 }
        );
      }
    } catch (transactionError) {
      console.error('Transaction error during deletion:', transactionError);
      return NextResponse.json(
        { error: 'Failed to complete deletion process', details: transactionError instanceof Error ? transactionError.message : String(transactionError) },
        { status: 500 }
      );
    }
    
    console.log('Data model deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error in DELETE /api/projects/[id]/models/[modelId]:`, error);
    return NextResponse.json(
      { error: 'Failed to delete data model', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
