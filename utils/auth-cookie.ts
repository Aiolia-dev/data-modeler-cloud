import { cookies } from 'next/headers';

/**
 * Gets the auth cookie for server-side API requests
 * This is needed to maintain the user's session when making fetch requests from server components
 */
export async function getAuthCookie(): Promise<string> {
  const cookieStore = cookies();
  const supabaseCookie = cookieStore.get('sb-auth-token');
  
  if (!supabaseCookie) {
    return '';
  }
  
  return `sb-auth-token=${supabaseCookie.value}`;
}
