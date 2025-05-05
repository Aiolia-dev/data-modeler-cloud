"use client"

import React, { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SuperuserTest() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isSuperuser, setIsSuperuser] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rawMetadata, setRawMetadata] = useState<any>(null)
  
  useEffect(() => {
    async function checkAuth() {
      try {
        setLoading(true)
        const supabase = createClientComponentClient()
        
        // Get current user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          setError(`Error getting user: ${userError.message}`)
          return
        }
        
        if (!currentUser) {
          setError("No user found. Please log in.")
          return
        }
        
        setUser(currentUser)
        console.log("Current user:", currentUser)
        
        // Check superuser status using RPC
        const { data: superuserData, error: superuserError } = await supabase.rpc('is_superuser')
        
        if (superuserError) {
          setError(`Error checking superuser status: ${superuserError.message}`)
          console.error("Superuser error:", superuserError)
          return
        }
        
        console.log("Superuser data:", superuserData)
        setIsSuperuser(!!superuserData)
        
        // Try direct SQL query for debugging
        try {
          const { data: directData, error: directError } = await supabase
            .from('direct_superuser_check')
            .select('*')
            .limit(1)
          
          console.log("Direct SQL check:", { data: directData, error: directError })
        } catch (e) {
          console.error("Error in direct check:", e)
        }
      } catch (err: any) {
        setError(`Unexpected error: ${err.message}`)
        console.error("Unexpected error:", err)
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [])
  
  // Function to manually set superuser status for testing
  const setUserAsSuperuser = async () => {
    try {
      const supabase = createClientComponentClient()
      
      if (!user) return
      
      // Try direct SQL update for testing
      const { error } = await supabase.rpc('promote_to_superuser', { 
        user_id: user.id 
      })
      
      if (error) {
        setError(`Error promoting to superuser: ${error.message}`)
        console.error("Error promoting:", error)
        return
      }
      
      // Refresh the page to see changes
      window.location.reload()
    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`)
      console.error("Unexpected error in promotion:", err)
    }
  }
  
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Superuser Test Page</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">User Information</h3>
                <p><strong>ID:</strong> {user?.id}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>User Metadata:</strong> {JSON.stringify(user?.user_metadata)}</p>
                <p><strong>App Metadata:</strong> {JSON.stringify(user?.app_metadata)}</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">Superuser Status</h3>
                <p>
                  <strong>Is Superuser:</strong>{' '}
                  {isSuperuser === null ? 'Unknown' : isSuperuser ? 'Yes' : 'No'}
                </p>
              </div>
              
              <div className="pt-4">
                <Button onClick={setUserAsSuperuser}>
                  Manually Set as Superuser
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
