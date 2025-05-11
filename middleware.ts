import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

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
  // First update the session (original middleware functionality)
  const response = await updateSession(request);
  
  // Apply security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Check if the request is for an admin route or project route
  const { pathname } = request.nextUrl;
  
  // Create a Supabase client for this request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set() {}, // We don't need to set cookies in this middleware check
        remove() {}, // We don't need to remove cookies in this middleware check
      },
    }
  );
  
  // Get the user from the session
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  
  if (!user) {
    // If no user, redirect to sign-in for protected routes
    if (pathname.startsWith('/protected') || pathname.startsWith('/admin-direct')) {
      const redirectUrl = new URL('/sign-in', request.url);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
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
     * - api routes
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
