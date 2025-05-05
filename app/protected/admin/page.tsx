"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, UserPlus, Shield, Database, Users } from "lucide-react"

interface User {
  id: string
  email: string
  confirmed_at: string
  is_superuser: boolean
}

interface DataModel {
  id: string
  name: string
  project_id: string
  project_name?: string
}

interface DataModelUser {
  id: string
  data_model_id: string
  user_id: string
  role: string
  assigned_at: string
  user_email?: string
  data_model_name?: string
}

export default function AdminDashboard() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [dataModels, setDataModels] = useState<DataModel[]>([])
  const [dataModelUsers, setDataModelUsers] = useState<DataModelUser[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [selectedDataModel, setSelectedDataModel] = useState<string>("")
  const [selectedRole, setSelectedRole] = useState<string>("viewer")
  
  useEffect(() => {
    async function checkSuperuser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('Error getting user:', error);
          router.push('/');
          return;
        }
        
        if (!user) {
          console.error('No user found');
          router.push('/');
          return;
        }
        
        console.log('User metadata:', user.user_metadata);
        
        // Check directly from user metadata
        if (user.user_metadata && user.user_metadata.is_superuser === 'true') {
          setIsSuperuser(true);
        } else {
          console.error('User is not a superuser');
          router.push('/');
          return;
        }
      } catch (err) {
        console.error('Unexpected error checking superuser status:', err);
        router.push('/');
      }
    }
    
    checkSuperuser();
  }, [router])
  
  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)
      
      
      // Use the is_superuser function to check if user is a superuser
      const { data: isSuperuser, error: superuserError } = await supabase.rpc('is_superuser')
      
      if (superuserError) {
        toast({
          title: "Error",
          description: "Failed to check permissions: " + superuserError.message,
          variant: "destructive"
        })
        router.push("/protected/projects")
        return
      }
      
      if (!isSuperuser) {
        toast({
          title: "Access Denied",
          description: "Only superusers can access the admin dashboard.",
          variant: "destructive"
        })
        router.push("/protected/projects")
        return
      }
      
      setCurrentUser({
        id: user.id,
        email: user.email || '',
        confirmed_at: user.confirmed_at || '',
        is_superuser: true
      })
      
      // Load data after confirming superuser status
      await Promise.all([
        fetchUsers(),
        fetchDataModels(),
        fetchDataModelUsers()
      ])
      
      setLoading(false)
    }
    
    checkSuperuser()
  }, [])
  
  const fetchUsers = async () => {
    try {
      // Use the get_all_users RPC function to securely fetch users
      const { data, error } = await supabase.rpc('get_all_users')
      
      if (error) {
        throw error
      }
      
      setUsers(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch users: ${error.message}`,
        variant: "destructive"
      })
      console.error("Error fetching users:", error)
    }
  }
  
  const fetchDataModels = async () => {
    try {
      const { data, error } = await supabase
        .from('data_models')
        .select(`
          id,
          name,
          project_id,
          projects(name)
        `)
      
      if (error) {
        throw error
      }
      
      if (!data) {
        setDataModels([])
        return
      }
      
      const formattedDataModels = data.map(dm => ({
        id: dm.id,
        name: dm.name,
        project_id: dm.project_id,
        project_name: dm.projects ? dm.projects.name : undefined
      }))
      
      setDataModels(formattedDataModels)
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch data models: ${error.message}`,
        variant: "destructive"
      })
      console.error("Error fetching data models:", error)
    }
  }
  
  const fetchDataModelUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('data_model_users')
        .select(`
          id,
          data_model_id,
          user_id,
          role,
          assigned_at,
          data_models(name),
          user:user_id(email)
        `)
      
      if (error) {
        throw error
      }
      
      if (!data) {
        setDataModelUsers([])
        return
      }
      
      const formattedDataModelUsers = data.map(dmu => ({
        id: dmu.id,
        data_model_id: dmu.data_model_id,
        user_id: dmu.user_id,
        role: dmu.role,
        assigned_at: dmu.assigned_at,
        user_email: dmu.user && typeof dmu.user === 'object' ? dmu.user.email : undefined,
        data_model_name: dmu.data_models && typeof dmu.data_models === 'object' ? dmu.data_models.name : undefined
      }))
      
      setDataModelUsers(formattedDataModelUsers)
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch data model users: ${error.message}`,
        variant: "destructive"
      })
      console.error("Error fetching data model users:", error)
    }
  }
  
  const handleAssignUser = async () => {
    if (!selectedUser || !selectedDataModel || !selectedRole) {
      toast({
        title: "Validation Error",
        description: "Please select a user, data model, and role.",
        variant: "destructive"
      })
      return
    }
    
    // Check if assignment already exists
    const existingAssignment = dataModelUsers.find(
      dmu => dmu.user_id === selectedUser && dmu.data_model_id === selectedDataModel
    )
    
    if (existingAssignment) {
      // Update existing assignment
      const { error } = await supabase
        .from('data_model_users')
        .update({
          role: selectedRole,
          assigned_by: currentUser?.id
        })
        .eq('id', existingAssignment.id)
      
      if (error) {
        toast({
          title: "Error",
          description: `Failed to update assignment: ${error.message}`,
          variant: "destructive"
        })
        return
      }
      
      toast({
        title: "Success",
        description: "User assignment updated successfully."
      })
    } else {
      // Create new assignment
      const { error } = await supabase
        .from('data_model_users')
        .insert({
          data_model_id: selectedDataModel,
          user_id: selectedUser,
          role: selectedRole,
          assigned_by: currentUser?.id
        })
      
      if (error) {
        toast({
          title: "Error",
          description: `Failed to assign user: ${error.message}`,
          variant: "destructive"
        })
        return
      }
      
      toast({
        title: "Success",
        description: "User assigned to data model successfully."
      })
    }
    
    // Refresh data and close modal
    await fetchDataModelUsers()
    setShowAssignModal(false)
    setSelectedUser("")
    setSelectedDataModel("")
    setSelectedRole("viewer")
  }
  
  const handleRemoveAssignment = async (assignmentId: string) => {
    const { error } = await supabase
      .from('data_model_users')
      .delete()
      .eq('id', assignmentId)
    
    if (error) {
      toast({
        title: "Error",
        description: `Failed to remove assignment: ${error.message}`,
        variant: "destructive"
      })
      return
    }
    
    toast({
      title: "Success",
      description: "User assignment removed successfully."
    })
    
    // Refresh data
    await fetchDataModelUsers()
  }
  
  const handlePromoteToSuperuser = async (userId: string) => {
    // In a real implementation, this would be done securely through a server-side function
    const { error } = await supabase.rpc('promote_to_superuser', { user_id: userId })
    
    if (error) {
      toast({
        title: "Error",
        description: `Failed to promote user: ${error.message}`,
        variant: "destructive"
      })
      return
    }
    
    toast({
      title: "Success",
      description: "User promoted to superuser successfully."
    })
    
    // Refresh users
    await fetchUsers()
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading admin dashboard...</span>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span>Logged in as {currentUser?.email}</span>
        </div>
      </div>
      
      <Tabs defaultValue="assignments">
        <TabsList className="mb-6">
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>Data Model Assignments</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>User Management</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Data Model Assignments</span>
                <Button onClick={() => setShowAssignModal(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign User
                </Button>
              </CardTitle>
              <CardDescription>
                Manage which users have access to specific data models
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataModelUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No user assignments found. Click "Assign User" to create one.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Data Model</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Assigned At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataModelUsers.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>{assignment.user_email}</TableCell>
                        <TableCell>{assignment.data_model_name}</TableCell>
                        <TableCell>
                          <span className={`capitalize ${
                            assignment.role === 'owner' 
                              ? 'text-blue-500' 
                              : assignment.role === 'editor' 
                                ? 'text-green-500' 
                                : 'text-gray-500'
                          }`}>
                            {assignment.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(assignment.assigned_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveAssignment(assignment.id)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View all users and manage superuser access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Confirmed</TableHead>
                      <TableHead>Superuser</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.confirmed_at 
                            ? <span className="text-green-500">Yes</span>
                            : <span className="text-red-500">No</span>
                          }
                        </TableCell>
                        <TableCell>
                          {user.is_superuser 
                            ? <span className="text-blue-500">Yes</span>
                            : <span className="text-gray-500">No</span>
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          {!user.is_superuser && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePromoteToSuperuser(user.id)}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Make Superuser
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Assign User Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User to Data Model</DialogTitle>
            <DialogDescription>
              Select a user and data model to create an access assignment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user" className="text-right">
                User
              </Label>
              <Select
                value={selectedUser}
                onValueChange={setSelectedUser}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(user => user.confirmed_at) // Only show confirmed users
                    .map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dataModel" className="text-right">
                Data Model
              </Label>
              <Select
                value={selectedDataModel}
                onValueChange={setSelectedDataModel}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a data model" />
                </SelectTrigger>
                <SelectContent>
                  {dataModels.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name} ({model.project_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select
                value={selectedRole}
                onValueChange={setSelectedRole}
              >
                <SelectTrigger className="col-span-3">
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
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignUser}>
              Save Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
