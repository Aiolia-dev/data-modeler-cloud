"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AuthTestPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<any>(null);
  
  useEffect(() => {
    // Initialize Supabase client only on the client side
    const supabaseClient = createClient();
    setSupabase(supabaseClient);
    
    async function getUser() {
      try {
        setLoading(true);
        const { data, error } = await supabaseClient.auth.getUser();
        
        if (error) {
          throw error;
        }
        
        setUser(data.user);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    
    getUser();
  }, []);
  
  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      window.location.href = "/sign-in";
    }
  };
  
  return (
    <div className="flex-1 w-full flex flex-col gap-8 p-4 md:p-8">
      <h1 className="text-3xl font-bold">Authentication Test</h1>
      
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md">
          <p>Error: {error}</p>
          <p className="mt-2">
            Please make sure your Supabase configuration is correct and try again.
          </p>
        </div>
      ) : user ? (
        <div className="flex flex-col gap-4">
          <div className="bg-accent p-4 rounded-md">
            <h2 className="text-xl font-semibold mb-2">User Information</h2>
            <pre className="text-xs font-mono p-3 bg-background rounded border max-h-64 overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
          
          <div className="flex gap-4">
            <Button onClick={handleSignOut}>Sign Out</Button>
            <Link href="/protected">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p>You are not signed in.</p>
          <div className="flex gap-4">
            <Link href="/sign-in">
              <Button>Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button variant="outline">Sign Up</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
