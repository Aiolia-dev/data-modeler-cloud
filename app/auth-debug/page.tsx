'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AuthDebugPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Create a browser client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function getSession() {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setError(error.message);
        } else {
          setSession(data.session);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    getSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Function to test the API endpoint
  const testApi = async () => {
    try {
      setApiLoading(true);
      const response = await fetch('/api/auth/test');
      const data = await response.json();
      setApiResponse(data);
    } catch (err) {
      console.error('API test error:', err);
      setApiResponse({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setApiLoading(false);
    }
  };

  // Function to sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Supabase Auth Debug</h1>
      
      {loading ? (
        <p>Loading session...</p>
      ) : error ? (
        <div className="bg-red-100 p-4 rounded mb-4">
          <h2 className="font-bold">Error:</h2>
          <p>{error}</p>
        </div>
      ) : (
        <div className="mb-4">
          <h2 className="font-bold">Session Status:</h2>
          <p className={session ? "text-green-600" : "text-red-600"}>
            {session ? "Authenticated" : "Not authenticated"}
          </p>
          
          {session && (
            <div className="mt-2">
              <h3 className="font-semibold">User:</h3>
              <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(session.user, null, 2)}
              </pre>
              
              <h3 className="font-semibold mt-2">Session Details:</h3>
              <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify({
                  expires_at: session.expires_at,
                  token_type: session.token_type,
                  refresh_token: session.refresh_token ? "[PRESENT]" : "[MISSING]"
                }, null, 2)}
              </pre>
              
              <button
                onClick={signOut}
                className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6 border-t pt-4">
        <h2 className="font-bold mb-2">Test Server-Side Session</h2>
        <button
          onClick={testApi}
          disabled={apiLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {apiLoading ? "Testing..." : "Test API Session"}
        </button>
        
        {apiResponse && (
          <div className="mt-2">
            <h3 className="font-semibold">API Response:</h3>
            <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="mt-6 border-t pt-4">
        <h2 className="font-bold mb-2">Cookie Information</h2>
        <p>Cookies are stored securely and can't be directly accessed by JavaScript. The following is just a check if cookies are enabled:</p>
        <p className="mt-2">
          <strong>Cookies Enabled: </strong>
          {navigator.cookieEnabled ? "Yes" : "No"}
        </p>
      </div>
    </div>
  );
}
