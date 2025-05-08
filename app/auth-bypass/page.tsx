"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AuthBypass() {
  const [status, setStatus] = useState("Checking authentication status...");
  const [authDetails, setAuthDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setStatus("Checking direct authentication status...");

        // Try to get user email from the UI
        const emailElement = document.querySelector("span:contains('cedric'), div:contains('@outscale.com')");
        const extractedEmail = emailElement ? emailElement.textContent?.trim() : null;
        if (extractedEmail) {
          setUserEmail(extractedEmail);
          setDebugInfo((prev: Record<string, any>) => ({ ...prev, extractedEmail }));
        }

        // Direct approach - create a new client each time
        const supabase = createClientComponentClient({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        });

        // First get session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        // Record debug info
        setDebugInfo((prev: Record<string, any>) => ({
          ...prev,
          sessionData,
          sessionError: sessionError?.message,
          hasSession: !!sessionData?.session
        }));

        if (sessionError) {
          setStatus(`Authentication error: ${sessionError.message}`);
          setLoading(false);
          return;
        }

        if (!sessionData?.session) {
          setStatus("No session found. Starting fallback authentication flow...");
          // Continue to try API approach
        } else {
          // We have a session, get the user
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) {
            setStatus(`Session found but user retrieval failed: ${userError?.message || "Unknown error"}`);
          } else {
            setStatus(`Authenticated as ${user.email}`);
            setAuthDetails(user);
            setLoading(false);
            return;
          }
        }

        // Direct API call approach as fallback
        const response = await fetch('/api/admin/direct-auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: userEmail || extractedEmail || "cedric.kerbidi@outscale.com", 
            bypass: true 
          }),
        });
        
        const data = await response.json();
        setDebugInfo((prev: Record<string, any>) => ({ ...prev, apiResponse: data }));
        
        if (!response.ok) {
          setStatus(`API auth failed: ${data.message || "Unknown error"}`);
        } else if (data.user) {
          setStatus(`API auth successful: ${data.user.email}`);
          setAuthDetails(data.user);
        } else {
          setStatus("API auth returned no user");
        }
      } catch (error: any) {
        console.error("Auth check error:", error);
        setStatus(`Error checking auth: ${error.message}`);
        setDebugInfo((prev: Record<string, any>) => ({ ...prev, error: error.toString() }));
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleSetSuperuser = async () => {
    try {
      setLoading(true);
      setStatus("Setting superuser status...");

      // Get the user ID from auth details or fallback to email
      const userId = authDetails?.id;
      const email = authDetails?.email || userEmail;
      
      if (!userId && !email) {
        setStatus("Cannot set superuser status: No user ID or email");
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/direct-superuser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email, bypassAuth: true }),
      });

      const result = await response.json();
      setDebugInfo((prev: Record<string, any>) => ({ ...prev, superuserResult: result }));

      if (!response.ok) {
        throw new Error(result.message || "Failed to set superuser");
      }

      setStatus(`Superuser status set successfully for ${result.user?.email || email}`);
      if (result.user) {
        setAuthDetails(result.user);
      }
    } catch (error: any) {
      console.error("Superuser error:", error);
      setStatus(`Error setting superuser: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 flex flex-col items-center">
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle>Direct Admin Access</CardTitle>
          <CardDescription>
            Emergency authentication bypass for admin access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded">
              <div className="mb-2 font-medium">Status:</div>
              <div className={`p-2 rounded ${status.includes('successful') ? 'bg-green-100 text-green-800' : status.includes('Error') || status.includes('failed') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                {status}
              </div>
            </div>

            {authDetails && (
              <div className="p-4 border rounded">
                <div className="mb-2 font-medium">Authentication Details:</div>
                <div><strong>Email:</strong> {authDetails.email}</div>
                <div><strong>ID:</strong> {authDetails.id}</div>
                <div><strong>Is Superuser:</strong> {authDetails.user_metadata?.is_superuser === "true" ? "Yes" : "No"}</div>
                {authDetails.user_metadata && (
                  <div className="mt-2">
                    <div className="font-medium">User Metadata:</div>
                    <pre className="bg-gray-100 p-2 text-xs overflow-auto rounded">
                      {JSON.stringify(authDetails.user_metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSetSuperuser}
                disabled={loading || !authDetails}
                className="w-full"
              >
                {loading ? "Processing..." : "Set Superuser Status"}
              </Button>

              {authDetails?.user_metadata?.is_superuser === "true" && (
                <Button
                  className="w-full" 
                  onClick={() => window.location.href = "/admin-direct"}
                  variant="default"
                >
                  Access Admin Dashboard
                </Button>
              )}

              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                disabled={loading}
              >
                Refresh Status
              </Button>
            </div>

            <div className="mt-4 p-4 border rounded">
              <div className="mb-2 font-medium">Debug Information:</div>
              <pre className="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded overflow-auto max-h-60">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
