import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Project reference from your Supabase URL
const PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/(?:https?:\/\/)?([^\.]+)/)?.[1] || '';

// Cookie names that Supabase Auth expects
const ACCESS_TOKEN_COOKIE = `sb-${PROJECT_REF}-access-token`;
const REFRESH_TOKEN_COOKIE = `sb-${PROJECT_REF}-refresh-token`;

export async function GET(request: NextRequest) {
  try {
    console.log('\n\n[API Route][/api/auth/test] ====== START DEBUG ======');
    
    // Get the cookie store - MUST be awaited
    const cookieStore = await cookies();
    
    // Log all cookies for diagnostics
    const allCookies = cookieStore.getAll();
    console.log('[TEST] All cookies:', allCookies.map(c => ({
      name: c.name,
      value: c.name.includes('token') ? `${c.value.substring(0, 20)}...` : c.value
    })));
    
    // Create a fresh Supabase client with the official pattern
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
          setAll: () => {} // Not needed for GET request
        }
      }
    );
    
    // Try to get the session
    console.log('[TEST] Calling supabase.auth.getSession()...');
    const { data, error } = await supabase.auth.getSession();
    
    // Log the result
    console.log('[TEST] getSession result:', { 
      hasSession: !!data?.session,
      hasUser: !!data?.session?.user,
      error: error ? error.message : null
    });
    
    // Check if we need to refresh the session
    if (!data.session && !error) {
      console.log('[TEST] No session found, trying to refresh...');
      
      // Get the refresh token
      const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
      
      if (refreshToken) {
        console.log('[TEST] Refresh token found, attempting to refresh session...');
        
        try {
          // Try to refresh the session manually
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: refreshToken,
          });
          
          console.log('[TEST] Refresh result:', {
            success: !!refreshData?.session,
            error: refreshError ? refreshError.message : null
          });
          
          if (refreshData?.session) {
            return NextResponse.json({
              success: true,
              message: 'Session refreshed successfully',
              user: refreshData.session.user,
              refreshed: true
            });
          }
        } catch (refreshErr) {
          console.error('[TEST] Error refreshing session:', refreshErr);
        }
      }
    }
    
    if (data.session) {
      return NextResponse.json({
        success: true,
        message: 'Session found',
        user: data.session.user
      });
    }
    
    return NextResponse.json({
      success: false,
      message: 'No session found',
      error: error ? error.message : 'Session is null'
    }, { status: 401 });
    
  } catch (error) {
    console.error('[TEST] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
