"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"

export default function DirectAdminAccess() {
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  
  // State
  const [loading, setLoading] = useState(true)
  const [dataModels, setDataModels] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [dataModelUsers, setDataModelUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [selectedDataModel, setSelectedDataModel] = useState<string>("")
  const [selectedRole, setSelectedRole] = useState<string>("viewer")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isSuperuser, setIsSuperuser] = useState(false)

  // Load user data on mount
  useEffect(() => {
    async function loadUserData() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error("Error getting user:", userError?.message || "No user found")
          toast({ 
            title: "Authentication Error",
            description: "Unable to verify your identity. Please log in again.",
            variant: "destructive"
          })
          return
        }

        setCurrentUser(user)
        console.log("User metadata:", user.user_metadata)
        
        // Check if user is superuser directly from metadata
        if (user.user_metadata && user.user_metadata.is_superuser === "true") {
          setIsSuperuser(true)
          await loadDashboardData()
        } else {
          toast({
            title: "Access Denied",
            description: "You must be a superuser to access this page.",
            variant: "destructive"
          })
        }
      } catch (error: any) {
        console.error("Error loading user data:", error)
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [])

  // Load dashboard data (users, data models, etc.)
  async function loadDashboardData() {
    setLoading(true)
    try {
      // Get all users
      const { data: usersData, error: usersError } = await supabase.rpc('get_all_users')
      
      if (usersError) {
        throw usersError
      }
      
      setUsers(usersData || [])

      // Get all data models
      const { data: dataModelsData, error: dataModelsError } = await supabase
        .from('data_models')
        .select('id, name')
      
      if (dataModelsError) {
        throw dataModelsError
      }
      
      setDataModels(dataModelsData || [])

      // Get existing data model user assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('data_model_users')
        .select('data_model_id, user_id, role')
      
      if (assignmentsError) {
        throw assignmentsError
      }
      
      setDataModelUsers(assignmentsData || [])
    } catch (error: any) {
      console.error("Error loading dashboard data:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Assign user to data model
  const assignUserToDataModel = async () => {
    if (!selectedUser || !selectedDataModel || !selectedRole) {
      toast({
        title: "Missing Information",
        description: "Please select a user, data model, and role.",
        variant: "destructive"
      })
      return
    }

    try {
      // Check if assignment already exists
      const existingAssignment = dataModelUsers.find(
        (dmu) => dmu.user_id === selectedUser && dmu.data_model_id === selectedDataModel
      )

      let result
      
      if (existingAssignment) {
        // Update existing assignment
        result = await supabase
          .from('data_model_users')
          .update({ role: selectedRole, assigned_at: new Date().toISOString() })
          .eq('user_id', selectedUser)
          .eq('data_model_id', selectedDataModel)
      } else {
        // Create new assignment
        result = await supabase
          .from('data_model_users')
          .insert({
            user_id: selectedUser,
            data_model_id: selectedDataModel,
            role: selectedRole,
            assigned_by: currentUser?.id
          })
      }

      if (result.error) {
        throw result.error
      }

      toast({
        title: "Success",
        description: "User assigned to data model successfully."
      })

      // Refresh data
      await loadDashboardData()
    } catch (error: any) {
      console.error("Error assigning user to data model:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  // Promote user to superuser
  const promoteToSuperuser = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('promote_to_superuser', { 
        user_id: userId 
      })
      
      if (error) {
        throw error
      }
      
      toast({
        title: "Success",
        description: "User promoted to superuser successfully."
      })
      
      // Refresh users
      const { data: usersData, error: usersError } = await supabase.rpc('get_all_users')
      
      if (usersError) {
        throw usersError
      }
      
      setUsers(usersData || [])
    } catch (error: any) {
      console.error("Error promoting user to superuser:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  // Helper to get assignment for a data model and user
  const getAssignmentRole = (dataModelId: string, userId: string) => {
    const assignment = dataModelUsers.find(
      (dmu) => dmu.data_model_id === dataModelId && dmu.user_id === userId
    )
    return assignment ? assignment.role : null
  }

  // Render loading state
  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center">
          <div className="animate-pulse">Loading admin dashboard...</div>
        </div>
      </div>
    )
  }

  // If not a superuser, show access denied
  if (!isSuperuser) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-red-500">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">You must be a superuser to access this page.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs defaultValue="assignments">
        <TabsList className="mb-4">
          <TabsTrigger value="assignments">Data Model Assignments</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Assign Users to Data Models</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <Label htmlFor="user-select">User</Label>
                  <Select 
                    value={selectedUser} 
                    onValueChange={setSelectedUser}
                  >
                    <SelectTrigger id="user-select">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="data-model-select">Data Model</Label>
                  <Select 
                    value={selectedDataModel} 
                    onValueChange={setSelectedDataModel}
                  >
                    <SelectTrigger id="data-model-select">
                      <SelectValue placeholder="Select a data model" />
                    </SelectTrigger>
                    <SelectContent>
                      {dataModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="role-select">Role</Label>
                  <Select 
                    value={selectedRole} 
                    onValueChange={setSelectedRole}
                  >
                    <SelectTrigger id="role-select">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button onClick={assignUserToDataModel}>
                Assign User to Data Model
              </Button>
              
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Current Assignments</h3>
                
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data Model</TableHead>
                        <TableHead>Users</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataModels.map((model) => (
                        <TableRow key={model.id}>
                          <TableCell className="font-medium">{model.name}</TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {users.filter(user => getAssignmentRole(model.id, user.id)).map(user => (
                                <div key={`${model.id}-${user.id}`} className="flex items-center gap-2">
                                  <span>{user.email}</span>
                                  <span className="text-xs bg-gray-200 rounded px-2 py-1">
                                    {getAssignmentRole(model.id, user.id)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Is Superuser</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          {user.is_superuser ? (
                            <span className="text-green-500">Yes</span>
                          ) : (
                            <span className="text-red-500">No</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {!user.is_superuser && (
                            <Button 
                              onClick={() => promoteToSuperuser(user.id)}
                              size="sm"
                              variant="outline"
                            >
                              Promote to Superuser
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
