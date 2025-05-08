import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// POST: Upsert presence, GET: List online users for a project
export async function POST(req: NextRequest) {
  console.log('POST /api/user-presence - Upserting user presence');
  try {
    const { user_id, project_id, last_seen_at } = await req.json();
    console.log(`Upserting presence for user ${user_id} in project ${project_id}`);

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

    // Upsert presence record using SQL function to avoid TypeScript issues
    const { error } = await (adminClient.rpc as any)('set_user_presence', {
      p_user_id: user_id,
      p_project_id: project_id,
      p_last_seen_at: last_seen_at
    });

    if (error) {
      console.error('Error upserting presence:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.log('Presence upserted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/user-presence:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  console.log('GET /api/user-presence - Fetching online users');
  try {
    const { searchParams } = new URL(req.url);
    const project_id = searchParams.get('projectId');
    if (!project_id) {
      console.error('Project ID is required');
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }
    console.log(`Fetching online users for project: ${project_id}`);

    // Get the current user
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

    // Get all online users for the project (last_seen_at within 2 min and is_online true)
    // Use raw SQL query to avoid TypeScript errors with the new table
    const { data, error } = await (adminClient.rpc as any)('get_online_users', {
      p_project_id: project_id,
      p_threshold_minutes: 2
    });

    if (error) {
      console.error('Error fetching online users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log(`Fetched ${data?.length || 0} online users for project ${project_id}`);
    return NextResponse.json({ users: data || [] });
  } catch (error) {
    console.error('Error in GET /api/user-presence:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
