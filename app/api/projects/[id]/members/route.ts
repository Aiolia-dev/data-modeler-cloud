import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const projectId = params.id;

  // 1. Get project members for this project
  const { data: membersData, error: membersError } = await supabase
    .from('project_members')
    .select('user_id, access, role')
    .eq('project_id', projectId);

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  if (!membersData || membersData.length === 0) {
    return NextResponse.json({ members: [] });
  }

  // 2. Get users from Supabase Admin API for these user_ids
  const userIds = membersData.map(m => m.user_id);

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all users (pagination is needed for large sets, but here we assume a small number)
  const { data: allUsersData, error: adminError } = await supabaseAdmin.auth.admin.listUsers();
  if (adminError) {
    return NextResponse.json({ error: adminError.message }, { status: 500 });
  }

  // Filter only users who are members
  const usersData = allUsersData.users.filter(u => userIds.includes(u.id));

  // 3. Merge the data
  const members = membersData.map(pm => {
    const user = usersData?.find(u => u.id === pm.user_id);
    return {
      user_id: pm.user_id,
      access: pm.access,
      role: pm.role,
      id: user?.id,
      email: user?.email,
      name: user?.user_metadata?.name || '',
    };
  });
  
  console.log('Members data:', members);

  return NextResponse.json({ members });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const projectId = params.id;
  
  try {
    // Get request body
    const body = await req.json();
    const { user_id, role, access } = body;
    
    // Validate input
    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    if (!role || !['viewer', 'editor', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Valid role is required (viewer, editor, or admin)' }, { status: 400 });
    }
    
    if (!access || !['read', 'edit'].includes(access)) {
      return NextResponse.json({ error: 'Valid access level is required (read or edit)' }, { status: 400 });
    }
    
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
    }
    
    // Check if the user is already a member of the project
    const { data: existingMember, error: checkError } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user_id)
      .maybeSingle();
    
    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }
    
    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this project' },
        { status: 400 }
      );
    }
    
    // Add the user to the project
    const { data: newMember, error: insertError } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: user_id,
        role: role,
        access: access,
      })
      .select()
      .single();
    
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, member: newMember });
  } catch (error) {
    console.error('Error adding project member:', error);
    return NextResponse.json(
      { error: 'Failed to add user to project' },
      { status: 500 }
    );
  }
}
