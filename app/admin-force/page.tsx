"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AdminForce() {
  const [status, setStatus] = useState<string>("Checking authentication...")
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const supabase = createClientComponentClient()
      
      // First get the session to ensure cookies are properly set
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error("Session error:", sessionError)
        setStatus(`Session error: ${sessionError.message}`)
        return
      }
      
      // Now get the user with the refreshed session
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error("Auth error:", error)
        setStatus(`Authentication error: ${error.message}`)
        return
      }
      
      if (!user) {
        setStatus("No authenticated user found. Please log in first.")
        return
      }
      
      setUser(user)
      setStatus(`Authenticated as ${user.email}. Checking superuser status...`)
      
      // Display the user metadata and session for debugging
      console.log("User metadata:", user.user_metadata)
      console.log("Session info:", sessionData)
      
      if (user.user_metadata && user.user_metadata.is_superuser === "true") {
        setStatus(`User ${user.email} is confirmed as a superuser.`)
      } else {
        setStatus(`User ${user.email} is NOT a superuser. Will attempt to set superuser status...`)
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      setStatus(`An unexpected error occurred: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const setDirectSuperuser = async () => {
    try {
      setLoading(true)
      
      if (!user) {
        setStatus("No authenticated user found. Cannot set superuser status.")
        return
      }
      
      setStatus("Attempting to set superuser status directly...")
      
      // Create a special endpoint for this purpose
      const response = await fetch('/api/set-direct-superuser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to set superuser status")
      }
      
      const result = await response.json()
      
      if (result.success) {
        setStatus(`Success! ${user.email} is now a superuser. Refreshing session...`)
        
        // Refresh the auth session
        const supabase = createClientComponentClient()
        await supabase.auth.refreshSession()
        
        // Check auth again to verify
        setTimeout(checkAuth, 1000)
      } else {
        setStatus(`Failed to set superuser status: ${result.message || "Unknown error"}`)
      }
    } catch (err: any) {
      console.error("Error setting superuser:", err)
      setStatus(`Error setting superuser status: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 flex flex-col items-center">
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle>Admin Force Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded">
              <div className="mb-2 font-medium">Status:</div>
              <div className={`p-2 rounded ${status.includes('Success') ? 'bg-green-100' : status.includes('error') ? 'bg-red-100' : 'bg-blue-100'}`}>
                {status}
              </div>
            </div>
            
            {user && (
              <div className="p-4 border rounded">
                <div className="mb-2 font-medium">User Information:</div>
                <div><strong>Email:</strong> {user.email}</div>
                <div><strong>ID:</strong> {user.id}</div>
                <div><strong>Metadata:</strong> {JSON.stringify(user.user_metadata || {})}</div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={setDirectSuperuser}
                disabled={loading || !user}
              >
                Force Superuser Status
              </Button>
              
              <Button 
                variant="outline" 
                onClick={checkAuth}
                disabled={loading}
              >
                Refresh Status
              </Button>
            </div>
            
            {user && user.user_metadata?.is_superuser === "true" && (
              <div className="mt-4">
                <Button
                  className="w-full" 
                  onClick={() => window.location.href = "/admin-direct"}
                >
                  Go to Direct Admin Page
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
