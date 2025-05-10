"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/auth-context';

export function AuthDebug() {
  const { user, session, isLoading, isAuthenticated, isSuperuser, refreshSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  const supabase = createClientComponentClient();

  const handleRefreshSession = async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      await refreshSession();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const checkCookies = async () => {
    try {
      // This is just for debugging purposes
      console.log('Checking cookies in browser:', document.cookie);
    } catch (err: any) {
      console.error('Error checking cookies:', err);
    }
  };

  return (
    <Card className="w-full mb-4">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Auth Debug (Enhanced)</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide' : 'Show'}
          </Button>
        </CardTitle>
        <CardDescription>
          Debug information for Supabase authentication using the new Auth Context
        </CardDescription>
      </CardHeader>
      
      {expanded && (
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkCookies} 
              >
                Check Cookies
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshSession} 
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Refresh Session'}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowRawData(!showRawData)}
              >
                {showRawData ? 'Show Summary' : 'Show Raw Data'}
              </Button>
            </div>
            
            {error && (
              <div className="p-4 bg-red-100 text-red-800 rounded-md">
                <strong>Error:</strong> {error}
              </div>
            )}
            
            {showRawData ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Session:</h3>
                  <pre className="p-4 bg-gray-100 rounded-md overflow-auto max-h-60 text-xs">
                    {JSON.stringify(session, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium">User:</h3>
                  <pre className="p-4 bg-gray-100 rounded-md overflow-auto max-h-60 text-xs">
                    {JSON.stringify(user, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium">Auth Context State:</h3>
                  <pre className="p-4 bg-gray-100 rounded-md overflow-auto max-h-60 text-xs">
                    {JSON.stringify({
                      isLoading,
                      isAuthenticated,
                      isSuperuser
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Authentication Status:</h3>
                  <p className="p-2 bg-gray-100 rounded-md">
                    {isAuthenticated ? (
                      <span className="text-green-600 font-medium">Authenticated</span>
                    ) : (
                      <span className="text-red-600 font-medium">Not authenticated</span>
                    )}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium">Superuser Status:</h3>
                  <p className="p-2 bg-gray-100 rounded-md">
                    {isSuperuser ? (
                      <span className="text-green-600 font-medium">Superuser</span>
                    ) : (
                      <span className="text-gray-600 font-medium">Regular User</span>
                    )}
                  </p>
                </div>
                
                {user && (
                  <div>
                    <h3 className="text-lg font-medium">User Info:</h3>
                    <div className="p-4 bg-gray-100 rounded-md space-y-2">
                      <p><strong>ID:</strong> {user.id}</p>
                      <p><strong>Email:</strong> {user.email}</p>
                      <p><strong>Created at:</strong> {new Date(user.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                
                {user?.user_metadata && (
                  <div>
                    <h3 className="text-lg font-medium">User Metadata:</h3>
                    <div className="p-4 bg-gray-100 rounded-md space-y-2">
                      {Object.entries(user.user_metadata).map(([key, value]) => (
                        <p key={key}>
                          <strong>{key}:</strong> {JSON.stringify(value)}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                
                {session && (
                  <div>
                    <h3 className="text-lg font-medium">Session Info:</h3>
                    <div className="p-4 bg-gray-100 rounded-md space-y-2">
                      <p><strong>Expires at:</strong> {session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'Not available'}</p>
                      <p><strong>Token type:</strong> {session.token_type || 'Not available'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}
      
      <CardFooter className="flex justify-between">
        <p className="text-sm text-gray-500">
          {user ? `Logged in as ${user.email}` : 'Not logged in'}
        </p>
        {isLoading && <p className="text-sm text-gray-500">Loading authentication state...</p>}
      </CardFooter>
    </Card>
  );
}
