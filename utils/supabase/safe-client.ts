'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a safe Supabase client that handles auth session errors gracefully
 * This prevents "Auth session missing" errors from appearing in the console
 */
export function createSafeClient() {
  // Create the standard client
  const supabase = createClientComponentClient();
  
  // Create a wrapper with safe methods
  const safeClient = {
    auth: {
      // Safe version of getUser that won't throw AuthSessionMissingError
      async getUser() {
        try {
          return await supabase.auth.getUser();
        } catch (error) {
          if (error instanceof Error && error.message.includes('Auth session missing')) {
            console.log('Safe getUser: Auth session missing, returning empty user');
            return { data: { user: null }, error: null };
          }
          throw error;
        }
      },
      
      // Safe version of getSession that won't throw AuthSessionMissingError
      async getSession() {
        try {
          return await supabase.auth.getSession();
        } catch (error) {
          if (error instanceof Error && error.message.includes('Auth session missing')) {
            console.log('Safe getSession: Auth session missing, returning empty session');
            return { data: { session: null }, error: null };
          }
          throw error;
        }
      },
      
      // Pass through other auth methods
      signInWithPassword: supabase.auth.signInWithPassword.bind(supabase.auth),
      signOut: supabase.auth.signOut.bind(supabase.auth),
      onAuthStateChange: supabase.auth.onAuthStateChange.bind(supabase.auth),
      updateUser: supabase.auth.updateUser.bind(supabase.auth),
      refreshSession: supabase.auth.refreshSession.bind(supabase.auth)
    },
    
    // Pass through other methods as needed
    from: supabase.from.bind(supabase),
    rpc: supabase.rpc.bind(supabase),
    storage: supabase.storage
  };
  
  return safeClient as SupabaseClient;
}

/**
 * Creates a browser client with proper configuration for authentication
 * This is the client that works correctly with the fixed sign-in form
 */
export function createFixedBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'pkce'
      }
    }
  );
}
