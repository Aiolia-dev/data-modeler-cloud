"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DirectAdmin() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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
          console.error("User error:", userError)
          setError(`Error getting user: ${userError.message}`)
          return
        }
        
        if (!user) {
          setError("No user found. Please log in.")
          return
        }
        
        console.log("User found:", user)
        setUser(user)
        
        // Check if user is a superuser by directly examining the metadata
        if (user.user_metadata && user.user_metadata.is_superuser === "true") {
          setIsSuperuser(true)
        } else {
          console.log("User is not a superuser according to metadata:", user.user_metadata)
        }
      } catch (err: any) {
        console.error("Unexpected error:", err)
        setError(`Unexpected error: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [])
  
  const goToAdminDashboard = () => {
    window.location.href = "/protected/admin"
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[500px]">
        <CardHeader>
          <CardTitle>Direct Admin Access</CardTitle>
          <CardDescription>
            Check your superuser status and access the admin dashboard
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
                <p><strong>User Metadata:</strong> {JSON.stringify(user?.user_metadata)}</p>
              </div>
              
              {isSuperuser ? (
                <div className="space-y-4">
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                    You are a superuser! You can access the admin dashboard.
                  </div>
                  <Button 
                    onClick={goToAdminDashboard} 
                    className="w-full"
                  >
                    Go to Admin Dashboard
                  </Button>
                </div>
              ) : (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                  You are not a superuser. Contact an administrator for access.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
