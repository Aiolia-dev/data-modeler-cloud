import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Refresh the session
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Error refreshing session:', error);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    // Get the user to ensure we have the latest metadata
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user after refresh:', userError);
      return NextResponse.json({ error: userError.message }, { status: 401 });
    }
    
    console.log('Session refreshed successfully, user metadata:', userData.user?.user_metadata);
    
    return NextResponse.json({ 
      success: true, 
      user: userData.user,
      session: data.session
    });
  } catch (err) {
    console.error('Unexpected error in auth refresh:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
