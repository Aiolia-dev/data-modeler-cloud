import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { createRouteHandlerClient } from '@/utils/supabase/fixed-client';

// Project reference from your Supabase URL
const PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/(?:https?:\/\/)?([^\.]+)/)?.[1] || '';

// Cookie names that Supabase Auth expects
const ACCESS_TOKEN_COOKIE = `sb-${PROJECT_REF}-access-token`;
const REFRESH_TOKEN_COOKIE = `sb-${PROJECT_REF}-refresh-token`;
const AUTH_TOKEN_COOKIE = `sb-${PROJECT_REF}-auth-token`;

export async function GET(request: NextRequest) {
  try {
    console.log('\n\n[API Route][/api/auth/me] ====== START DEBUG ======');
    console.log(`[API Route] SSR Package Info: @supabase/ssr@0.6.1, @supabase/supabase-js@2.49.4`);
    
    // Get the cookie store - MUST be awaited
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Check for presence of auth cookies
    const hasAccessToken = allCookies.some(c => c.name === ACCESS_TOKEN_COOKIE);
    const hasRefreshToken = allCookies.some(c => c.name === REFRESH_TOKEN_COOKIE);
    const hasAuthToken = allCookies.some(c => c.name === AUTH_TOKEN_COOKIE);
    
    console.log(`[API Route] Cookie presence: ACCESS=${hasAccessToken}, REFRESH=${hasRefreshToken}, AUTH=${hasAuthToken}`);
    
    // Log all cookies for diagnostics
    console.log('[API Route] All cookies:', allCookies.map(c => ({
      name: c.name,
      value: c.name.includes('token') ? `${c.value.substring(0, 20)}...` : c.value.substring(0, 10)
    })));
    
    // Log actual token values for debugging
    const accessToken = allCookies.find(c => c.name === ACCESS_TOKEN_COOKIE)?.value;
    const refreshToken = allCookies.find(c => c.name === REFRESH_TOKEN_COOKIE)?.value;
    
    if (accessToken) {
      console.log(`[API Route] Access token found: ${accessToken.substring(0, 20)}...`);
      // Parse JWT to check expiry
      try {
        const [header, payload, signature] = accessToken.split('.');
        const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
        console.log(`[API Route] Access token payload:`, {
          exp: decodedPayload.exp,
          expiryDate: new Date(decodedPayload.exp * 1000).toISOString(),
          currentTime: new Date().toISOString(),
          isExpired: decodedPayload.exp * 1000 < Date.now()
        });
      } catch (e) {
        console.error(`[API Route] Error parsing JWT:`, e);
      }
    } else {
      console.log(`[API Route] No access token found`);
    }
    
    if (refreshToken) {
      console.log(`[API Route] Refresh token found: ${refreshToken}`);
    } else {
      console.log(`[API Route] No refresh token found`);
    }
    
    // Create Supabase client using the fixed implementation for Next.js App Router
    console.log('[API Route] Creating Supabase client with fixed implementation');
    
    // Create a Supabase client with the correct async cookie handling
    const supabase = await createRouteHandlerClient();
    
    console.log('[API Route] Calling supabase.auth.getSession()...');
    const { data, error } = await supabase.auth.getSession();
    
    console.log(`[API Route] getSession result:`, { 
      hasSession: !!data?.session,
      hasUser: !!data?.session?.user,
      error: error ? { message: error.message, status: error.status } : null
    });
    
    if (error) {
      console.error('[API Route] Error getting auth session:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!data.session || !data.session.user) {
      console.log('[API Route] No session or user found, returning 401');
      return NextResponse.json({ 
        error: 'Not authenticated',
        debugInfo: {
          hasAccessToken,
          hasRefreshToken,
          hasAuthToken,
          currentTime: new Date().toISOString(),
        }
      }, { status: 401 });
    }
    
    // Session found, return user info
    console.log(`[API Route] User authenticated successfully: ${data.session.user.email}`);
    console.log('[API Route] ====== END DEBUG ======\n');
    
    return NextResponse.json({
      user: data.session.user,
      authenticated: true,
      debugInfo: {
        tokenExpiry: data.session.expires_at
          ? new Date(data.session.expires_at * 1000).toISOString()
          : 'unknown',
        currentTime: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('[API Route] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
