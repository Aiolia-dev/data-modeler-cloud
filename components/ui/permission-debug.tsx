"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from '@/context/permission-context';
import { useAuth } from '@/context/auth-context';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * A debug component to display user permissions and metadata
 * This is useful for debugging permission issues
 */
export function PermissionDebug() {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get permission context data
  const { 
    isSuperuser: permissionIsSuperuser, 
    currentProjectRole, 
    currentProjectId,
    hasPermission,
    userId: permissionUserId,
    userEmail: permissionUserEmail,
    isAuthenticated: permissionIsAuthenticated,
    projectPermissions
  } = usePermissions();
  
  // Get auth context data for comparison
  const {
    user,
    isAuthenticated: authIsAuthenticated,
    isSuperuser: authIsSuperuser
  } = useAuth();
  
  // We can directly use the user metadata from the auth context
  const userMetadata = user?.user_metadata || null;

  const fetchUserMetadata = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const supabase = createClientComponentClient();
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Get the user data
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.user_metadata) {
          console.log('User metadata from direct API call:', user.user_metadata);
          // We don't need to set metadata here since we're getting it from the auth context
          // This is just for comparison in the console
        } else {
          setError('No user metadata found in direct API call');
        }
      } else {
        setError('No active session found in direct API call');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!expanded) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700"
      >
        Debug Permissions
      </Button>
    );
  }
  
  return (
    <Card className="fixed bottom-4 right-4 z-50 w-96 bg-gray-800 border-gray-700 text-gray-200">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Permission Debug</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setExpanded(false)}
            className="text-gray-400 hover:text-gray-200"
          >
            Close
          </Button>
        </CardTitle>
        <CardDescription className="text-gray-400">
          Debug information about user permissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Permission Context State:</h3>
            <div className="p-4 bg-gray-100 rounded-md space-y-2">
              <p><strong>Is Authenticated:</strong> {permissionIsAuthenticated ? 'Yes' : 'No'}</p>
              <p><strong>Is Superuser:</strong> {permissionIsSuperuser ? 'Yes' : 'No'}</p>
              <p><strong>User ID:</strong> {permissionUserId || 'Not available'}</p>
              <p><strong>User Email:</strong> {permissionUserEmail || 'Not available'}</p>
              <p><strong>Current Project ID:</strong> {currentProjectId || 'Not available'}</p>
              <p><strong>Current Project Role:</strong> {currentProjectRole || 'Not available'}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">Auth Context State:</h3>
            <div className="p-4 bg-gray-100 rounded-md space-y-2">
              <p><strong>Is Authenticated:</strong> {authIsAuthenticated ? 'Yes' : 'No'}</p>
              <p><strong>Is Superuser:</strong> {authIsSuperuser ? 'Yes' : 'No'}</p>
              <p><strong>User ID:</strong> {user?.id || 'Not available'}</p>
              <p><strong>User Email:</strong> {user?.email || 'Not available'}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <h3 className="text-sm font-medium">User Metadata</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchUserMetadata}
              disabled={loading}
              className="text-xs h-6 px-2"
            >
              {loading ? 'Loading...' : 'Fetch Metadata'}
            </Button>
          </div>
          
          {error && (
            <div className="bg-red-900/30 border border-red-700 p-2 rounded text-red-300 text-xs">
              {error}
            </div>
          )}
          
          {userMetadata && (
            <div className="rounded bg-gray-900 p-2 text-xs">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(userMetadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Project Permissions</h3>
          <div className="rounded bg-gray-900 p-2 text-xs max-h-40 overflow-y-auto">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(projectPermissions, null, 2)}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
