import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Project reference from your Supabase URL
const PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/(?:https?:\/\/)?([^\.]+)/)?.[1] || '';

// Cookie names that Supabase Auth expects
const ACCESS_TOKEN_COOKIE = `sb-${PROJECT_REF}-access-token`;
const REFRESH_TOKEN_COOKIE = `sb-${PROJECT_REF}-refresh-token`;
const AUTH_TOKEN_COOKIE = `sb-${PROJECT_REF}-auth-token`;

// For debugging only
console.log(`[Supabase] Using cookie names: ACCESS=${ACCESS_TOKEN_COOKIE}, REFRESH=${REFRESH_TOKEN_COOKIE}, AUTH=${AUTH_TOKEN_COOKIE}`);

/**
 * Create a Supabase client for server components and server actions
 * This function is now async to properly handle cookies in Next.js App Router
 */
export async function createClient() {
  // Next.js cookies API for server components - must be awaited
  const cookieStore = await cookies();
  
  const standardTokenMigration = (name: string): string => {
    // If we detect old-style auth-token, try to get session info
    if (name === ACCESS_TOKEN_COOKIE || name === REFRESH_TOKEN_COOKIE) {
      try {
        if (typeof document !== 'undefined') {
          // Client-side: Check for the auth-token cookie
          const match = document.cookie.match(new RegExp(`(^| )${AUTH_TOKEN_COOKIE}=([^;]+)`));
          if (match) {
            // If found, extract the tokens from the JSON-formatted value
            const authTokenValue = decodeURIComponent(match[2]);
            try {
              const [accessToken, refreshToken] = JSON.parse(authTokenValue);
              return name === ACCESS_TOKEN_COOKIE ? accessToken : refreshToken;
            } catch (e) {
              console.error('[Supabase] Failed to parse auth token:', e);
            }
          }
        } else if (typeof document === 'undefined') {
          // Server-side: For server components, we can't reliably access cookies easily
          // This is handled by Supabase's server-side auth mechanism
          // We don't attempt to extract tokens on the server-side here
          // It's better handled in the middleware
        }
      } catch (e) {
        console.error('[Supabase] Error in cookie migration:', e);
      }
    }
    return '';
  };
  
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Client-side
          if (typeof document !== 'undefined') {
            // Check for cookie directly
            const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
            if (match) return decodeURIComponent(match[2]);
            
            // Try migration from auth-token if standard cookies aren't found
            return standardTokenMigration(name);
          }
          
          // Server-side - use the awaited cookieStore
          // We now have access to the cookieStore directly
          return cookieStore.get(name)?.value || '';
        },
        set(name: string, value: string, options) {
          // Client-side only
          if (typeof document !== 'undefined') {
            // Always set both standard cookies and our legacy cookie for compatibility
            let cookie = `${name}=${encodeURIComponent(value)}`;
            if (options?.path) cookie += `; path=${options.path}`;
            if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
            if (options?.domain) cookie += `; domain=${options.domain}`;
            if (options?.sameSite) cookie += `; samesite=${options.sameSite}`;
            if (options?.secure || process.env.NODE_ENV === 'production') cookie += '; secure';
            document.cookie = cookie;
            
            console.log(`[Supabase] Set cookie: ${name}`);
          }
          // Server-side cookies are handled by the framework
        },
        remove(name: string, options) {
          // Client-side only
          if (typeof document !== 'undefined') {
            document.cookie = `${name}=; max-age=0; path=${options?.path || '/'}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            console.log(`[Supabase] Removed cookie: ${name}`);
          }
          // Server-side cookies are handled by the framework
        },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    }
  );
}

// Alias for backward compatibility
export const createServerClient = createClient;


/**
 * Middleware client for Supabase
 * This handles cookies correctly in the middleware context
 */
import { cookies as nextCookies } from 'next/headers';

/**
 * Middleware client for Supabase
 * This handles cookies correctly in the middleware context
 * NOTE: All cookie access must be async using the cookies() API in Next.js App Router/middleware.
 */
export async function createMiddlewareClient(request: NextRequest) {
  const response = NextResponse.next();

  // Use the async cookies() API for all cookie access
  const cookieStore = await nextCookies();
  const hasAuthToken = !!cookieStore.get(AUTH_TOKEN_COOKIE);
  const hasAccessToken = !!cookieStore.get(ACCESS_TOKEN_COOKIE);
  const hasRefreshToken = !!cookieStore.get(REFRESH_TOKEN_COOKIE);

  // Debug logging for cookie state
  console.log(`[Middleware][ASYNC] Cookie status: AUTH=${hasAuthToken}, ACCESS=${hasAccessToken}, REFRESH=${hasRefreshToken}`);

  // If we have an auth-token but not the standard tokens, migrate
  if (hasAuthToken && (!hasAccessToken || !hasRefreshToken)) {
    try {
      const authTokenValue = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
      if (authTokenValue) {
        const parsed = JSON.parse(authTokenValue);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          const [accessToken, refreshToken] = parsed;
          if (accessToken && !hasAccessToken) {
            response.cookies.set({
              name: ACCESS_TOKEN_COOKIE,
              value: accessToken,
              path: '/',
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true
            });
            console.log(`[Middleware][ASYNC] Migrated ${ACCESS_TOKEN_COOKIE} from auth-token`);
          }
          if (refreshToken && !hasRefreshToken) {
            response.cookies.set({
              name: REFRESH_TOKEN_COOKIE,
              value: refreshToken,
              path: '/',
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true
            });
            console.log(`[Middleware][ASYNC] Migrated ${REFRESH_TOKEN_COOKIE} from auth-token`);
          }
          // Remove legacy auth-token after migration
          response.cookies.delete(AUTH_TOKEN_COOKIE);
          console.log(`[Middleware][ASYNC] Deleted legacy ${AUTH_TOKEN_COOKIE} after migration`);
          // Immediately redirect so browser will send new cookies
          const redirectResponse = NextResponse.redirect(request.nextUrl);
          response.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie);
          });
          return { supabase: null, response: redirectResponse };
        }
      }
    } catch (e) {
      console.error('[Middleware][ASYNC] Error migrating auth-token to standard tokens:', e);
    }
  }

  // Use async cookie getter for Supabase client
  const supabase = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Return all cookies as an array of { name, value }
          return Array.from(cookieStore.getAll()).map(({ name, value }) => ({ name, value }));
        },
        setAll(cookies: { name: string; value: string; options?: any }[]) {
          // Set multiple cookies
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set({
              name,
              value,
              path: options?.path || '/',
              maxAge: options?.maxAge,
              expires: options?.expires,
              httpOnly: options?.httpOnly ?? true,
              sameSite: options?.sameSite || 'lax',
              secure: options?.secure ?? process.env.NODE_ENV === 'production',
            });
          });
        }
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    }
  );
  
  return {
    supabase,
    response
  };
}
