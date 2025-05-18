import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Create a Supabase client for the middleware
  const supabase = createMiddlewareClient<Database>({ req, res });
  
  try {
    // This refreshes the session if needed and extends the cookie expiry
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[Auth Middleware] Error getting session:', error);
    }
    
    // Log middleware execution for debugging
    console.log(`[Auth Middleware] Path: ${req.nextUrl.pathname}, Has Session: ${!!session}`);
    
    // If we have a session, refresh it to keep it alive
    if (session) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('[Auth Middleware] Error refreshing session:', refreshError);
      } else if (refreshData.session) {
        console.log('[Auth Middleware] Session refreshed successfully');
        
        // If we have user metadata, log it for debugging
        if (refreshData.user?.user_metadata) {
          console.log('[Auth Middleware] User metadata:', refreshData.user.user_metadata);
          console.log('[Auth Middleware] Is superuser:', refreshData.user.user_metadata.is_superuser);
        }
      }
    }
    
    // For protected routes, redirect to login if no session
    if (req.nextUrl.pathname.startsWith('/protected') && !session) {
      console.log('[Auth Middleware] No session found, redirecting to sign-in');
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
    
    // If we have a session and we're on the sign-in page, redirect to protected
    if (session && (req.nextUrl.pathname === '/sign-in' || req.nextUrl.pathname === '/login')) {
      console.log('[Auth Middleware] Session found on sign-in page, redirecting to protected');
      return NextResponse.redirect(new URL('/protected', req.url));
    }
  } catch (err) {
    console.error('[Auth Middleware] Unexpected error:', err);
  }
  
  return res;
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    '/protected/:path*',
    '/api/:path*',
  ],
};
