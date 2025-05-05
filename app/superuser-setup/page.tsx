"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SuperuserSetup() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSuperuser, setIsSuperuser] = useState(false)
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true)
        const supabase = createClientComponentClient()
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          setError(`Error getting user: ${userError.message}`)
          return
        }
        
        if (!user) {
          setError("No user found. Please log in.")
          return
        }
        
        setUser(user)
        console.log("Current user:", user)
        
        // Check if user is already a superuser
        const { data: superuserData, error: superuserError } = await supabase.rpc('is_superuser')
        
        if (superuserError) {
          console.error("Error checking superuser status:", superuserError)
        } else {
          setIsSuperuser(!!superuserData)
        }
      } catch (err: any) {
        setError(`Unexpected error: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [])
  
  const setAsSuperuser = async () => {
    try {
      setLoading(true)
      setError("")
      setMessage("")
      
      if (!user) {
        setError("No user found. Please log in first.")
        return
      }
      
      const supabase = createClientComponentClient()
      
      // Direct SQL update to set user as superuser
      const { data, error } = await supabase.rpc('direct_set_superuser')
      
      if (error) {
        console.error("Error setting superuser:", error)
        setError(`Error setting superuser: ${error.message}`)
        return
      }
      
      setMessage("Superuser status set successfully! You can now access the admin dashboard.")
      setIsSuperuser(true)
      
      // Refresh the session
      await supabase.auth.refreshSession()
    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[500px]">
        <CardHeader>
          <CardTitle>Superuser Setup</CardTitle>
          <CardDescription>
            Set up your account as a superuser to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 border rounded">
                <h3 className="text-lg font-medium">User Information</h3>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>ID:</strong> {user?.id}</p>
                <p><strong>Is Superuser:</strong> {isSuperuser ? "Yes" : "No"}</p>
              </div>
              
              {message && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                  {message}
                </div>
              )}
              
              {!isSuperuser ? (
                <Button 
                  onClick={setAsSuperuser} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Processing..." : "Set as Superuser"}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                    You are already a superuser!
                  </div>
                  <Button 
                    onClick={() => window.location.href = "/protected/admin"} 
                    className="w-full"
                  >
                    Go to Admin Dashboard
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
