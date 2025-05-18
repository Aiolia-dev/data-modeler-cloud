import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          // Get the cookie value
          const value = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
            ?.split('=')[1];
          return value ? decodeURIComponent(value) : undefined;
        },
        set(name, value, options) {
          try {
            // Set cookie with proper attributes
            document.cookie = `${name}=${encodeURIComponent(value)}${options?.domain ? `; Domain=${options.domain}` : ''}${options?.path ? `; Path=${options.path}` : ''}${options?.maxAge ? `; Max-Age=${options.maxAge}` : ''}${options?.expires ? `; Expires=${options.expires.toUTCString()}` : ''}${options?.httpOnly ? '; HttpOnly' : ''}${options?.secure ? '; Secure' : ''}; SameSite=Lax`;
          } catch (error) {
            console.error('Error setting cookie:', error);
          }
        },
        remove(name, options) {
          try {
            // Remove cookie by setting expiration in the past
            document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;${options?.domain ? ` Domain=${options.domain};` : ''}${options?.secure ? ' Secure;' : ''} SameSite=Lax`;
          } catch (error) {
            console.error('Error removing cookie:', error);
          }
        },
      },
    }
  );
};
