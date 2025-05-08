import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// PATCH: Set user offline for a project
export async function PATCH(req: NextRequest) {
  console.log('PATCH /api/user-presence/offline - Setting user offline');
  try {
    const { user_id, project_id } = await req.json();
    console.log(`Setting user ${user_id} offline in project ${project_id}`);
    
    // Get the current user for authentication
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        { error: 'Authentication error', details: userError.message },
        { status: 401 }
      );
    }
    
    // Use admin client to bypass RLS policies
    const adminClient = createAdminClient();

    // Use raw SQL query to update presence since the Supabase types may not be updated yet
    const { error } = await (adminClient.rpc as any)('set_user_offline', {
      p_user_id: user_id,
      p_project_id: project_id
    });

    if (error) {
      console.error('Error setting user offline:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.log('User set to offline successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/user-presence/offline:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
