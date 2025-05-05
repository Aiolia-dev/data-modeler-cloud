import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Capture all cookie information for debugging
    const cookieStore = cookies();
    
    // Handle cookies correctly for different versions of Next.js
    let allCookies: { name: string, value: string, path?: string, secure?: boolean }[] = [];
    try {
      // For newer versions of Next.js where cookies() returns a Promise
      if (typeof cookieStore.getAll === 'function') {
        allCookies = await (cookieStore as any).getAll();
      } else {
        // For older versions of Next.js
        allCookies = cookieStore.getAll();
      }
    } catch (e) {
      console.error("Error getting cookies:", e);
    }
    
    const cookieNames = allCookies.map((c: { name: string }) => c.name);
    
    // Use your server createClient method which handles cookies properly
    const supabase = await createClient();
    
    // Get current session and user 
    const { data, error } = await supabase.auth.getSession();
    const session = data.session;
    const user = data.session?.user;
    
    // Get admin client to check user directly if needed
    let adminCheckData = null;
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (adminKey && supabaseUrl) {
      try {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js');
        const adminSupabase = createAdminClient(supabaseUrl, adminKey);
        
        // Check for the authenticated user in the header
        const headerUserEmail = request.headers.get('x-user-email') || "";
        if (headerUserEmail) {
          // Directly check if the user exists in auth.users
          const { data: userData } = await adminSupabase.auth.admin.listUsers();
          const matchedUser = userData.users?.find(u => u.email === headerUserEmail);
          
          adminCheckData = { 
            headerEmail: headerUserEmail, 
            userFound: !!matchedUser,
            userId: matchedUser?.id 
          };
        }
      } catch (adminError) {
        console.error("Admin check error:", adminError);
        adminCheckData = { error: "Admin check failed" };
      }
    }

    if (error) {
      console.error("Session error:", error.message);
      return NextResponse.json(
        { 
          message: error.message, 
          error: error,
          debug: { 
            type: "session_error",
            cookieNames,
            allCookies: allCookies.map((c: any) => ({ name: c.name, path: c.path, secure: c.secure })),
            adminCheckData,
            requestHeaders: Object.fromEntries(request.headers),
          } 
        },
        { status: 401 }
      );
    }

    if (!session || !user) {
      // Try the direct approach as a fallback using headers
      const authHeader = request.headers.get('authorization');
      const userEmail = request.headers.get('x-user-email');
      
      if (userEmail) {
        return NextResponse.json(
          { 
            message: "Session not found, but user email found in header",
            userEmail,
            debug: { 
              type: "header_auth_only",
              cookieNames,
              authHeader: authHeader ? 'present' : 'missing',
              allCookies: allCookies.map((c: any) => ({ name: c.name, path: c.path })),
              adminCheckData,
              requestHeaders: Object.fromEntries(request.headers),
            }
          },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { 
          message: "No active session found", 
          debug: { 
            type: "no_session",
            cookieNames,
            allCookies: allCookies.map((c: any) => ({ name: c.name, path: c.path, secure: c.secure })),
            adminCheckData,
            requestHeaders: Object.fromEntries(request.headers),
          }
        },
        { status: 401 }
      );
    }

    // Return user information
    return NextResponse.json({
      user,
      session: {
        expires_at: session.expires_at,
        token_type: session.token_type,
      },
      debug: {
        hasSession: true,
        cookieNames,
        supabaseUrl,
        adminCheckData,
        requestHeaders: Object.fromEntries(request.headers),
        type: "success"
      }
    });
  } catch (error: any) {
    console.error("Unexpected error checking user:", error);
    return NextResponse.json(
      { 
        message: error.message || "An unexpected error occurred",
        debug: { 
          type: "unexpected_error",
          error: error.toString(),
          stack: error.stack
        }
      },
      { status: 500 }
    );
  }
}
