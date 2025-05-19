import { type NextRequest, NextResponse } from "next/server";

/**
 * NOTE: All cookie access in middleware must use async APIs (e.g., cookies() from next/headers).
 * The Supabase middleware client must be awaited, as it is now async.
 */
import { createMiddlewareClient } from "@/utils/supabase/fixed-client";
import { checkRateLimit, applyRateLimitHeaders, createRateLimitExceededResponse } from "@/utils/rate-limit";
import { logApiRequest } from "@/utils/api-logger";

// Security header definitions
const securityHeaders = {
  // Content-Security-Policy
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co; frame-ancestors 'none';",
  
  // Prevent browsers from incorrectly detecting non-scripts as scripts
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Force HTTPS connections
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Control browser features and APIs
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};

export async function middleware(request: NextRequest) {
  // Track start time for response time calculation
  const startTime = Date.now();
  
  // Check if this is an API request
  const isApiRequest = request.nextUrl.pathname.startsWith('/api');
  
  // Apply rate limiting for API requests
  if (isApiRequest) {
    // Check rate limit status
    const rateLimitInfo = checkRateLimit(request);
    
    // If rate limit exceeded, return 429 Too Many Requests
    if (rateLimitInfo.limited) {
      // Log the rate-limited API request
      await logApiRequest({
        path: request.nextUrl.pathname,
        method: request.method,
        statusCode: 429,
        responseTimeMs: Date.now() - startTime,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 
                  request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
      
      return createRateLimitExceededResponse(rateLimitInfo);
    }
    
    // Initialize Supabase client with the request and response (async)
    const { supabase, response: supabaseResponse } = await createMiddlewareClient(request);
    
    // Get user ID from session if available
    let userId: string | undefined;
    try {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        userId = data.session?.user?.id;
      }
    } catch (error) {
      console.error('Error getting user ID for API logging:', error);
    }
    
    // Log the API request regardless of authentication status
    await logApiRequest({
      userId,
      path: request.nextUrl.pathname,
      method: request.method,
      statusCode: supabaseResponse.status,
      responseTimeMs: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 
                request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // Apply rate limit headers
    applyRateLimitHeaders(supabaseResponse, rateLimitInfo);
    
    // Apply security headers to all responses
    Object.entries(securityHeaders).forEach(([key, value]) => {
      supabaseResponse.headers.set(key, value);
    });

    return supabaseResponse;
  }
  
  // For non-API requests, proceed with normal middleware
  const securityResponse = NextResponse.next();
  
  // Apply security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    securityResponse.headers.set(key, value);
  });
  
  // Get the current pathname
  const { pathname } = request.nextUrl;
  
  // Check if the request is for an authentication route that needs security check
  const requiresSecurityCheck = 
    (pathname.startsWith('/sign-in') || 
     pathname.startsWith('/sign-up') || 
     pathname === '/auth-pages/sign-in' || 
     pathname === '/auth-pages/sign-up');
  
  // Check if the security check has been passed
  const securityCheckPassed = request.cookies.get('security_check_passed')?.value === 'true';
  
  // If the route requires security check and the check hasn't been passed, redirect to security-check
  if (requiresSecurityCheck && !securityCheckPassed && pathname !== '/security-check') {
    // Create the redirect URL with the original destination as a query parameter
    const redirectUrl = new URL('/security-check', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    
    return NextResponse.redirect(redirectUrl);
  }
  
  // Initialize Supabase client for non-API routes (async)
  const { supabase, response } = await createMiddlewareClient(request);

  // If migration occurred and a redirect is needed, return immediately
  if (!supabase) {
    return response;
  }

  // Debug: print the token values being passed (async cookies)
  const cookieStore = await (await import('next/headers')).cookies();
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/(?:https?:\/\/)?([^\.]+)/)?.[1];
  const accessTokenName = projectRef ? `sb-${projectRef}-access-token` : 'undefined';
  const refreshTokenName = projectRef ? `sb-${projectRef}-refresh-token` : 'undefined';
  console.log('[DEBUG] ACCESS TOKEN:', cookieStore.get(accessTokenName)?.value);
  console.log('[DEBUG] REFRESH TOKEN:', cookieStore.get(refreshTokenName)?.value);

  // Get the user from the session
  let { data, error } = await supabase.auth.getSession();
  console.log('[DEBUG] Supabase getSession data:', data, 'error:', error);
  
  // If no session but we have a refresh token, try to refresh the session
  if (!data.session && cookieStore.get(refreshTokenName)?.value) {
    console.log('[DEBUG] No session found but refresh token exists, attempting to refresh...');
    try {
      const refreshToken = cookieStore.get(refreshTokenName)?.value;
      if (refreshToken) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: refreshToken
        });
        
        if (refreshData?.session) {
          console.log('[DEBUG] Session refreshed successfully');
          data = refreshData;
          error = refreshError;
        } else if (refreshError) {
          console.error('[DEBUG] Error refreshing session:', refreshError);
        }
      }
    } catch (refreshErr) {
      console.error('[DEBUG] Unexpected error refreshing session:', refreshErr);
    }
  }
  
  const user = data.session?.user;

  // Debug log to track authentication state and cookies
  console.log(`[Middleware] Path: ${pathname}, Has User: ${!!user}, User Email: ${user?.email || 'none'}`);
  console.log('[Middleware] Session:', data.session, 'Error:', error);
  console.log('[Middleware] Cookies:', cookieStore.getAll());
  
  
  if (!user) {
    // If no user, redirect to sign-in for protected routes
    if (pathname.startsWith('/protected') || pathname.startsWith('/admin-direct')) {
      console.log('[Main Middleware] No user found, redirecting to sign-in');
      const redirectUrl = new URL('/sign-in', request.url);
      // Return the redirect response directly, not the Supabase response
      return NextResponse.redirect(redirectUrl);
    }
    // For non-protected routes, return the Supabase response
    return response;
  }
  
  // If we have a user and we're on the sign-in page, redirect to protected
  if (user && (pathname === '/sign-in' || pathname === '/login')) {
    console.log('[Main Middleware] User found on sign-in page, redirecting to protected');
    const redirectUrl = new URL('/protected', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Check if user is a superuser
  const isSuperuser = user.user_metadata?.is_superuser === 'true';
  
  // Admin route protection
  if (pathname.startsWith('/admin-direct') && !isSuperuser) {
    console.log('Non-superuser attempted to access admin area:', user.email);
    const redirectUrl = new URL('/protected', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Project route protection
  // Match routes like /protected/projects/{projectId} and all its subpaths
  // But exclude the /protected/projects/new path
  const projectRouteMatch = pathname.match(/\/protected\/projects\/([^/]+)/);
  if (projectRouteMatch && projectRouteMatch[1] !== 'new') {
    const projectId = projectRouteMatch[1];
    
    // Skip check for superusers - they can access all projects
    if (isSuperuser) {
      return response;
    }
    
    // Check if user is the creator of the project
    const { data: projectData } = await supabase
      .from('projects')
      .select('created_by')
      .eq('id', projectId)
      .single();
    
    if (projectData?.created_by === user.id) {
      // User is the creator/owner
      return response;
    }
    
    // Check if user is a member of the project
    const { data: memberData } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('user_id', user.id);
    
    if (memberData && memberData.length > 0) {
      // User is a member
      return response;
    }
    
    // User doesn't have access to this project
    console.log('Unauthorized project access attempt:', user.email, 'Project:', projectId);
    const redirectUrl = new URL('/protected', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    
    // Include API routes for rate limiting
    "/api/(.*)",
  ],
};
