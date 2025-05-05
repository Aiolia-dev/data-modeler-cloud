import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user to verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 401 }
      );
    }
    
    // Create admin client to access auth.users
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Fetch all users
    const { data: allUsersData, error: adminError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (adminError) {
      console.error('Error fetching users:', adminError);
      return NextResponse.json(
        { error: adminError.message },
        { status: 500 }
      );
    }
    
    // Map users to a simpler format
    const users = allUsersData.users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || '',
    }));
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
