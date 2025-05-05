import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';

export async function GET() {
  console.log('GET /api/projects - Fetching projects');
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
    
    // Check if user is a superuser
    const isSuperuser = user.user_metadata?.is_superuser === 'true';
    console.log('User is superuser:', isSuperuser);
    
    let projects: any[] = [];
    let projectsError = null;
    
    // If superuser, fetch all projects
    if (isSuperuser) {
      console.log('Fetching all projects for superuser');
      const adminClient = createAdminClient();
      const result = await adminClient
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });
      
      projects = result.data || [];
      projectsError = result.error;
    } else {
      // For regular users, we need to fetch two types of projects:
      // 1. Projects where the user is a member (in project_members table)
      // 2. Projects where the user is the creator (created_by field)
      
      // First, get projects where user is a member
      console.log('Fetching projects for regular user based on project_members');
      const memberResult = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);
      
      if (memberResult.error) {
        console.error('Error fetching project memberships:', memberResult.error);
        return NextResponse.json(
          { error: 'Failed to fetch project memberships', details: memberResult.error.message },
          { status: 500 }
        );
      }
      
      // Then, get projects where user is the creator
      console.log('Fetching projects where user is the creator');
      const adminClient = createAdminClient();
      const creatorResult = await adminClient
        .from('projects')
        .select('id')
        .eq('created_by', user.id);
      
      if (creatorResult.error) {
        console.error('Error fetching created projects:', creatorResult.error);
        return NextResponse.json(
          { error: 'Failed to fetch created projects', details: creatorResult.error.message },
          { status: 500 }
        );
      }
      
      // Combine project IDs from both queries (removing duplicates)
      const memberProjectIds = memberResult.data?.map(pm => pm.project_id) || [];
      const createdProjectIds = creatorResult.data?.map(p => p.id) || [];
      
      // Combine and remove duplicates manually (avoiding Set spread which causes TypeScript errors)
      const projectIdMap: Record<string, boolean> = {};
      [...memberProjectIds, ...createdProjectIds].forEach(id => {
        projectIdMap[id] = true;
      });
      const uniqueProjectIds = Object.keys(projectIdMap);
      
      console.log('User has access to projects:', uniqueProjectIds);
      
      // If user has access to any projects, fetch their details
      if (uniqueProjectIds.length > 0) {
        const projectsResult = await adminClient
          .from('projects')
          .select('*')
          .in('id', uniqueProjectIds)
          .order('updated_at', { ascending: false });
        
        projects = projectsResult.data || [];
        projectsError = projectsResult.error;
      } else {
        console.log('User does not have access to any projects');
      }
    }
    
    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return NextResponse.json(
        { error: 'Failed to fetch projects', details: projectsError.message },
        { status: 500 }
      );
    }
    
    console.log('Projects fetched successfully:', projects.length);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log('POST /api/projects - Creating a new project');
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
      console.error('Project name is required');
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }
    
    console.log('Creating project:', { name, description, created_by: user.id });
    
    // Create the project using the admin client to bypass RLS policies
    try {
      const adminClient = createAdminClient();
      
      const { data: project, error: projectError } = await adminClient
        .from('projects')
        .insert({
          name,
          description: description || null,
          created_by: user.id
        })
        .select()
        .single();
      
      if (projectError) {
        console.error('Error creating project:', projectError);
        return NextResponse.json(
          { error: 'Failed to create project in database', details: projectError.message },
          { status: 500 }
        );
      }
      
      // Add the creating user as a project member with owner role
      const { error: memberError } = await adminClient
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: user.id,
          role: 'owner',
          email: user.email
        });
      
      if (memberError) {
        console.error('Error adding user as project member:', memberError);
        // Don't return an error here, as the project was created successfully
        // Just log the error and continue
      } else {
        console.log('Added user as project member successfully');
      }
      
      console.log('Project created successfully:', project);
      return NextResponse.json({ project });
    } catch (projectError) {
      console.error('Error creating project:', projectError);
      return NextResponse.json(
        { error: 'Failed to create project in database', details: projectError instanceof Error ? projectError.message : String(projectError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unhandled error in POST /api/projects:', error);
    return NextResponse.json(
      { error: 'Failed to create project', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
