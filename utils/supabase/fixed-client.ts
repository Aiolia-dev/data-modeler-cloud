/**
 * Fixed Supabase client implementation
 * This file provides a correct implementation of Supabase authentication for Next.js App Router
 */
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Project reference from your Supabase URL
const PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/(?:https?:\/\/)?([^\.]+)/)?.[1] || '';

// Cookie names that Supabase Auth expects
const ACCESS_TOKEN_COOKIE = `sb-${PROJECT_REF}-access-token`;
const REFRESH_TOKEN_COOKIE = `sb-${PROJECT_REF}-refresh-token`;

/**
 * Creates a Supabase client for use in the browser
 */
export const createClient = createBrowserClient;

/**
 * Creates a Supabase client for server components
 * This function is async and properly handles cookies in Next.js App Router
 */
export async function createServerComponentClient() {
  // Next.js cookies API for server components - must be awaited
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
        setAll: () => {
          // This won't be called in server components
          console.warn('setAll called in server component where it has no effect');
        }
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce'
      }
    }
  );
}

/**
 * Creates a Supabase client for API routes
 * This function is async and properly handles cookies in Next.js App Router
 */
export async function createRouteHandlerClient(request?: NextRequest, response?: NextResponse) {
  // Next.js cookies API for API routes - must be awaited
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
        setAll: (cookies: { name: string; value: string; options?: CookieOptions }[]) => {
          if (!response) return;
          
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
        detectSessionInUrl: false,
        flowType: 'pkce'
      }
    }
  );
}

/**
 * Creates a Supabase client for middleware
 * This function is async and properly handles cookies in Next.js App Router middleware
 */
export async function createMiddlewareClient(request: NextRequest) {
  const response = NextResponse.next();
  
  // Use the async cookies() API for all cookie access
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
        setAll: (cookies: { name: string; value: string; options?: CookieOptions }[]) => {
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
        detectSessionInUrl: false,
        flowType: 'pkce'
      }
    }
  );
  
  return { supabase, response };
}
