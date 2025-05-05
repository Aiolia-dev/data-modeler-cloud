import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Use Promise.resolve to properly await the params object
  const { id } = await Promise.resolve(params);
  const projectId = id;
  console.log(`GET /api/projects/${projectId} - Fetching project details`);
  
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
    
    // Use admin client to bypass RLS policies
    const adminClient = createAdminClient();
    
    // Fetch project details
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json(
        { error: 'Failed to fetch project', details: projectError.message },
        { status: 500 }
      );
    }
    
    // Fetch data models for this project
    const { data: dataModels, error: dataModelsError } = await adminClient
      .from('data_models')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });
    
    if (dataModelsError) {
      console.error('Error fetching data models:', dataModelsError);
      return NextResponse.json(
        { error: 'Failed to fetch data models', details: dataModelsError.message },
        { status: 500 }
      );
    }
    
    console.log(`Project and ${dataModels.length} data models fetched successfully`);
    return NextResponse.json({ project, dataModels });
  } catch (error) {
    console.error(`Error fetching project ${projectId}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch project details', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Use Promise.resolve to properly await the params object
  const { id } = await Promise.resolve(params);
  const projectId = id;
  console.log(`PATCH /api/projects/${projectId} - Updating project details`);
  
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
    
    const { name, description } = body;
    
    // Validate input
    if (!name && !description) {
      console.error('No update data provided');
      return NextResponse.json(
        { error: 'At least one field (name or description) must be provided' },
        { status: 400 }
      );
    }
    
    // Prepare update data
    const updateData: { name?: string; description?: string | null } = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    
    console.log(`Updating project ${projectId}:`, updateData);
    
    // Use admin client to bypass RLS policies
    const adminClient = createAdminClient();
    
    // Update project
    const { data: updatedProject, error: updateError } = await adminClient
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating project:', updateError);
      return NextResponse.json(
        { error: 'Failed to update project', details: updateError.message },
        { status: 500 }
      );
    }
    
    console.log('Project updated successfully:', updatedProject);
    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    console.error(`Error updating project ${projectId}:`, error);
    return NextResponse.json(
      { error: 'Failed to update project', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Use Promise.resolve to properly await the params object
  const { id } = await Promise.resolve(params);
  const projectId = id;
  console.log(`DELETE /api/projects/${projectId} - Deleting project`);
  
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
    
    // Use admin client to bypass RLS policies
    const adminClient = createAdminClient();
    
    // First, check if the user is the creator of the project
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('created_by')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json(
        { error: 'Failed to fetch project', details: projectError.message },
        { status: 500 }
      );
    }
    
    // Check if the user is the creator of the project
    if (project.created_by !== user.id) {
      console.error('User is not the creator of the project');
      return NextResponse.json(
        { error: 'Unauthorized - Only the creator can delete a project' },
        { status: 403 }
      );
    }
    
    // Delete related data first (cascade delete not implemented in Supabase RLS)
    // 1. Delete project members
    const { error: membersError } = await adminClient
      .from('project_members')
      .delete()
      .eq('project_id', projectId);
    
    if (membersError) {
      console.error('Error deleting project members:', membersError);
      // Continue with deletion even if there's an error with members
    }
    
    // 2. Get all data models for this project
    const { data: dataModels, error: modelsError } = await adminClient
      .from('data_models')
      .select('id')
      .eq('project_id', projectId);
    
    if (!modelsError && dataModels && dataModels.length > 0) {
      // Get all model IDs
      const modelIds = dataModels.map(model => model.id);
      
      // 3. Delete entities for all data models
      for (const modelId of modelIds) {
        // Get all entities for this model
        const { data: entities, error: entitiesError } = await adminClient
          .from('entities')
          .select('id')
          .eq('data_model_id', modelId);
        
        if (!entitiesError && entities && entities.length > 0) {
          // Get all entity IDs
          const entityIds = entities.map(entity => entity.id);
          
          // Delete attributes for all entities
          for (const entityId of entityIds) {
            await adminClient
              .from('attributes')
              .delete()
              .eq('entity_id', entityId);
          }
          
          // Delete relationships related to these entities
          await adminClient
            .from('relationships')
            .delete()
            .in('source_entity_id', entityIds);
          
          await adminClient
            .from('relationships')
            .delete()
            .in('target_entity_id', entityIds);
          
          // Delete comments related to these entities
          await adminClient
            .from('comments')
            .delete()
            .in('entity_id', entityIds);
          
          // Delete rules related to these entities
          await adminClient
            .from('rules')
            .delete()
            .in('entity_id', entityIds);
        }
        
        // Delete all entities for this model
        await adminClient
          .from('entities')
          .delete()
          .eq('data_model_id', modelId);
        
        // Delete comments related to this model
        await adminClient
          .from('comments')
          .delete()
          .eq('data_model_id', modelId);
      }
      
      // 4. Delete all data models for this project
      await adminClient
        .from('data_models')
        .delete()
        .eq('project_id', projectId);
    }
    
    // 5. Finally, delete the project itself
    const { error: deleteError } = await adminClient
      .from('projects')
      .delete()
      .eq('id', projectId);
    
    if (deleteError) {
      console.error('Error deleting project:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete project', details: deleteError.message },
        { status: 500 }
      );
    }
    
    console.log('Project deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error deleting project ${projectId}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete project', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
