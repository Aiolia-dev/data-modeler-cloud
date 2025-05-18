'use client';

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from '@supabase/ssr';
import { Button } from "./ui/button";
import { EnvVarWarning } from "./env-var-warning";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";

export default function ConditionalHeaderAuth() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create a fresh browser client
  const supabase = createBrowserClient(
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

  useEffect(() => {
    async function checkUser() {
      setIsLoading(true);
      const { data } = await supabase.auth.getSession();
      
      if (data?.session) {
        setUser(data.session.user);
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    }

    checkUser();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: any) => {
        if (session) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);
  
  // Always show the auth UI in the main layout
  // We've removed it from the protected layout
  
  if (isLoading) {
    return null;
  }
  
  if (!hasEnvVars) {
    return <EnvVarWarning />;
  }
  
  return user ? (
    <div className="flex items-center gap-4">
      Hey, <span className="user-email">{user.email}</span>!
      <Button 
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.href = '/sign-in';
        }}
        variant={"outline"}
      >
        Sign out
      </Button>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
