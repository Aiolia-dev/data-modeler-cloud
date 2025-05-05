"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthFixEnhanced() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [user, setUser] = useState<any>(null)
  const [sessionData, setSessionData] = useState<any>(null)
  
  // Check current session on page load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClientComponentClient()
        
        // Try session.refresh() first
        const refreshResult = await supabase.auth.refreshSession()
        console.log("Session refresh result:", refreshResult)
        
        // Then get the session
        const { data, error } = await supabase.auth.getSession()
        
        console.log("Session check:", { data, error })
        setSessionData(data)
        
        if (data?.session) {
          setUser(data.session.user)
          setMessage(`Already logged in as ${data.session.user.email}`)
        }
      } catch (err: any) {
        console.error("Session check error:", err)
      }
    }
    
    checkSession()
  }, [])
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")
    
    try {
      const supabase = createClientComponentClient()
      
      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        setError(error.message)
        return
      }
      
      setUser(data.user)
      setMessage(`Successfully logged in as ${data.user.email}`)
      
      console.log("Login success:", data)
      
      // Force refresh and update session in local storage
      const refreshResult = await supabase.auth.refreshSession()
      console.log("Session refresh after login:", refreshResult)
      
      // Set the session data state
      setSessionData(refreshResult.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const goToProtected = () => {
    window.location.href = "/protected"
  }
  
  const goToAdminDashboard = () => {
    window.location.href = "/protected/admin"
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle>Enhanced Authentication</CardTitle>
          <CardDescription>
            Forcing session refresh and fixing authentication issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-4">
              <div className="p-4 border rounded bg-green-50">
                <h3 className="text-lg font-medium">Currently Logged In</h3>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Is Superuser:</strong> {user.user_metadata?.is_superuser === "true" ? "Yes" : "No"}</p>
              </div>
              
              {message && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                  {message}
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Session Data</h3>
                <pre className="p-2 bg-gray-800 text-white rounded overflow-auto max-h-40 text-xs">
                  {JSON.stringify(sessionData, null, 2)}
                </pre>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button onClick={goToProtected}>
                  Go to Protected Area
                </Button>
                <Button onClick={goToAdminDashboard}>
                  Go to Admin Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              {message && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                  {message}
                </div>
              )}
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
