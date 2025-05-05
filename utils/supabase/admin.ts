import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// This client uses the SUPABASE_SERVICE_ROLE_KEY which bypasses Row Level Security
// Use with caution - only for server-side operations that need to bypass RLS
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not defined. This is required for admin operations.');
    // Instead of throwing an error, we'll fall back to using the anon key
    // This allows the application to continue functioning, but without admin privileges
    return createClient<Database>(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  
  return createClient<Database>(
    supabaseUrl,
    supabaseServiceKey
  );
};
