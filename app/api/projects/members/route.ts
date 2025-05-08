import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// This endpoint fetches all project members for all projects
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  
  // 1. Get all project members
  const { data: membersData, error: membersError } = await supabase
    .from('project_members')
    .select('project_id, user_id, role, access');

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  if (!membersData || membersData.length === 0) {
    return NextResponse.json({ projectMembers: {} });
  }

  // 2. Get users from Supabase Admin API
  // Use a different approach to get unique user IDs without using Set spread
  const userIdMap: Record<string, boolean> = {};
  membersData.forEach(m => {
    if (m.user_id) {
      userIdMap[m.user_id] = true;
    }
  });
  const userIds = Object.keys(userIdMap);

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

  // 3. Group members by project
  const projectMembers: Record<string, any[]> = {};
  
  membersData.forEach(pm => {
    const user = usersData.find(u => u.id === pm.user_id);
    if (!user) return;
    
    if (!projectMembers[pm.project_id]) {
      projectMembers[pm.project_id] = [];
    }
    
    projectMembers[pm.project_id].push({
      user_id: pm.user_id,
      role: pm.role,
      access: pm.access,
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || '',
    });
  });

  return NextResponse.json({ projectMembers });
}
