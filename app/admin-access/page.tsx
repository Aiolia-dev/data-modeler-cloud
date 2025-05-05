"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function AdminAccess() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Enter your credentials");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Check if already authenticated on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("Authenticating...");

    try {
      // Use a direct fetch to the server action API endpoint
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const result = await response.json();
      setDebugInfo(result);
      
      if (!response.ok) {
        throw new Error(result.message || 'Authentication failed');
      }
      
      if (result.user) {
        setUser(result.user);
        setStatus(`Authenticated as ${result.user.email}`);
        
        // Check if user has superuser status
        if (result.user.user_metadata?.is_superuser === "true") {
          setStatus(`${result.user.email} is confirmed as a superuser`);
        } else {
          setStatus(`${result.user.email} is not a superuser. Will use admin API to set status.`);
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const setSuperuserStatus = async () => {
    if (!user) {
      setStatus("No user authenticated");
      return;
    }
    
    setLoading(true);
    setStatus("Setting superuser status...");
    
    try {
      const response = await fetch('/api/admin/set-superuser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to set superuser status');
      }
      
      setStatus(`Successfully set superuser status for ${user.email}`);
      
      // Refresh the user data
      const userResponse = await fetch('/api/admin/check-user');
      const userData = await userResponse.json();
      
      if (userData.user) {
        setUser(userData.user);
      }
    } catch (error: any) {
      console.error('Error setting superuser:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    setLoading(true);
    setStatus("Checking authentication status...");
    
    try {
      const response = await fetch('/api/admin/check-user');
      const result = await response.json();
      setDebugInfo(result);
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to check user status');
      }
      
      if (result.user) {
        setUser(result.user);
        setStatus(`User is authenticated as ${result.user.email}`);
        
        // Check superuser status
        if (result.user.user_metadata?.is_superuser === "true") {
          setStatus(`${result.user.email} is confirmed as a superuser`);
        } else {
          setStatus(`${result.user.email} is not a superuser`);
        }
      } else {
        setUser(null);
        setStatus("No authenticated user found");
      }
    } catch (error: any) {
      console.error('Error checking auth:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 flex flex-col items-center">
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle>Admin Access</CardTitle>
          <CardDescription>
            Secure admin access with server-side authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded">
              <div className="mb-2 font-medium">Status:</div>
              <div className={`p-2 rounded ${status.includes('confirmed') || status.includes('superuser') ? 'bg-green-100 text-green-800' : status.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                {status}
              </div>
            </div>
            
            {user ? (
              <div className="p-4 border rounded">
                <div className="mb-2 font-medium">User Information:</div>
                <div><strong>Email:</strong> {user.email}</div>
                <div><strong>ID:</strong> {user.id}</div>
                <div><strong>Metadata:</strong> {JSON.stringify(user.user_metadata || {})}</div>
              </div>
            ) : (
              <form onSubmit={handleAdminLogin} className="p-4 border rounded space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Admin Login"}
                </Button>
              </form>
            )}
            
            <div className="flex gap-2">
              {user && (
                <Button 
                  onClick={setSuperuserStatus}
                  disabled={loading || !user}
                  className="flex-1"
                >
                  Set Superuser Status
                </Button>
              )}
              
              <Button 
                variant={user ? "outline" : "default"} 
                onClick={checkAuthStatus}
                disabled={loading}
                className="flex-1"
              >
                Check Auth Status
              </Button>
            </div>
            
            {user && user.user_metadata?.is_superuser === "true" && (
              <div className="mt-4">
                <Button
                  className="w-full" 
                  onClick={() => window.location.href = "/admin-direct"}
                >
                  Go to Direct Admin Dashboard
                </Button>
              </div>
            )}
            
            {/* Debug information */}
            {debugInfo && (
              <div className="mt-4 p-4 border rounded">
                <div className="mb-2 font-medium">Debug Information:</div>
                <pre className="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
