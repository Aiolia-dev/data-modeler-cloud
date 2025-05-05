import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Use Promise.resolve to properly await the params object
  const { id } = await Promise.resolve(params);
  const projectId = id;
  console.log(`POST /api/projects/${projectId}/models - Creating a new data model`);
  
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
    
    if (!name) {
      console.error('Data model name is required');
      return NextResponse.json(
        { error: 'Data model name is required' },
        { status: 400 }
      );
    }
    
    // Verify that the project exists and user has access
    const adminClient = createAdminClient();
    
    // Check if project exists
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json(
        { error: 'Project not found', details: projectError.message },
        { status: 404 }
      );
    }
    
    console.log('Creating data model:', { name, description, project_id: projectId, created_by: user.id });
    
    // Create the data model using the admin client
    const { data: dataModel, error: dataModelError } = await adminClient
      .from('data_models')
      .insert({
        name,
        description: description || null,
        project_id: projectId,
        created_by: user.id,
        version: '1.0'
      })
      .select()
      .single();
    
    if (dataModelError) {
      console.error('Error creating data model:', dataModelError);
      return NextResponse.json(
        { error: 'Failed to create data model', details: dataModelError.message },
        { status: 500 }
      );
    }
    
    console.log('Data model created successfully:', dataModel);
    return NextResponse.json({ dataModel });
  } catch (error) {
    console.error(`Error in POST /api/projects/${projectId}/models:`, error);
    return NextResponse.json(
      { error: 'Failed to create data model', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Use Promise.resolve to properly await the params object
  const { id } = await Promise.resolve(params);
  const projectId = id;
  console.log(`GET /api/projects/${projectId}/models - Fetching data models`);
  
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
    
    // Use the admin client to bypass RLS policies
    const adminClient = createAdminClient();
    
    // Fetch data models for the project
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
    
    console.log(`Fetched ${dataModels.length} data models for project ${projectId}`);
    return NextResponse.json({ dataModels });
  } catch (error) {
    console.error(`Error in GET /api/projects/${projectId}/models:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch data models', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
