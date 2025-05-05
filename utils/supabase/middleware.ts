import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  try {
    // Create an unmodified response
    let response = NextResponse.next();

    // Create a Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value;
          },
          set(name, value, options) {
            // If the request is redirected, the cookies will be lost, so we need to set them manually
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name, options) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            });
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const { data, error } = await supabase.auth.getSession();
    
    // Add debugging information to response headers
    response.headers.set('X-Auth-Debug', JSON.stringify({
      hasSession: !!data?.session,
      error: error?.message || null,
      path: request.nextUrl.pathname
    }));

    // Skip authentication checks for the following routes
    if (
      request.nextUrl.pathname.startsWith('/api/') ||
      request.nextUrl.pathname.startsWith('/auth-fix') ||
      request.nextUrl.pathname.startsWith('/direct-admin') ||
      request.nextUrl.pathname.startsWith('/admin-direct') ||
      request.nextUrl.pathname.startsWith('/admin-force') ||
      request.nextUrl.pathname.startsWith('/admin-access') ||
      request.nextUrl.pathname.startsWith('/auth-bypass') ||
      request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname === '/sign-in' ||
      request.nextUrl.pathname === '/'
    ) {
      return response;
    }
    
    // For protected routes, verify session exists
    if (request.nextUrl.pathname.startsWith("/protected")) {
      if (!data?.session) {
        console.log('No session found for protected route:', request.nextUrl.pathname);
        // Add a refresh cookie to force a new session on the sign-in page
        response = NextResponse.redirect(new URL("/sign-in", request.url));
        response.cookies.set('session-refresh', Date.now().toString(), {
          path: '/',
          maxAge: 60, // Short-lived cookie
          sameSite: 'lax'
        });
        return response;
      }
    }

    // Redirect from root to protected area if session exists
    if (request.nextUrl.pathname === "/" && data?.session) {
      return NextResponse.redirect(new URL("/protected", request.url));
    }

    return response;
  } catch (e) {
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    // Check out http://localhost:3000 for Next Steps.
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
