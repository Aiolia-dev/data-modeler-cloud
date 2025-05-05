"use client";

import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import React from "react";
import AddUserModal from "@/components/modals/AddUserModal";
import ChangeAccessModal from "@/components/modals/ChangeAccessModal";
import AssignValidatorModal from "@/components/modals/AssignValidatorModal";

type Member = {
  user_id: string;
  role: string;
  name: string;
  email: string;
  id: string;
};

type ValidationRole = {
  id: string;
  user_id: string;
  validation_role_id: string;
  data_model_id: string | null;
  component_scope: string | null;
  created_at: string;
  updated_at: string;
  validation_roles: {
    id: string;
    name: string;
    description: string | null;
  };
  users: {
    id: string;
    email: string;
  };
};

export default function ProjectAccessPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [members, setMembers] = React.useState<Member[]>([]);
  const [validationRoles, setValidationRoles] = React.useState<ValidationRole[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingRoles, setLoadingRoles] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rolesError, setRolesError] = React.useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = React.useState(false);
  const [showChangeAccessModal, setShowChangeAccessModal] = React.useState(false);
  const [showAssignValidatorModal, setShowAssignValidatorModal] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<Member | null>(null);
  const [selectedValidationRole, setSelectedValidationRole] = React.useState<ValidationRole | null>(null);

  // Fetch project members
  React.useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetch(`/api/projects/${projectId}/members`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          setMembers([]);
        } else {
          setMembers(data.members);
          setError(null);
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch members');
        setMembers([]);
        setLoading(false);
      });
  }, [projectId]);
  
  // Fetch validation roles
  React.useEffect(() => {
    if (!projectId) return;
    fetchValidationRoles();
  }, [projectId]);

  // Fetch real project info
  const [project, setProject] = React.useState<{ name: string; description: string }>({ name: '', description: '' });
  React.useEffect(() => {
    if (!projectId) return;
    console.log('Fetching project info for ID:', projectId);
    fetch(`/api/projects/${projectId}`)
      .then(res => res.json())
      .then(data => {
        console.log('Project data received:', data);
        // The API returns project data in a nested 'project' object
        if (data && data.project && data.project.name) {
          setProject({ 
            name: data.project.name, 
            description: data.project.description || '' 
          });
        } else {
          setProject({ name: projectId, description: '' });
        }
      })
      .catch((err) => {
        console.error('Error fetching project:', err);
        setProject({ name: projectId, description: '' });
      });
  }, [projectId]);

  return (
    <div className="max-w-3xl mx-auto py-10 project-access-page">
      <button
        className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 back-button"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>
      <Card className="bg-[#1F2937] border border-gray-700 rounded-xl shadow-lg overflow-hidden card">
        <CardHeader>
          <CardTitle className="text-white dark:text-white light:text-[#1E293B]">Project Users</CardTitle>
          <CardDescription className="text-gray-400 dark:text-gray-400 light:text-gray-500">{project.name || 'Loading project...'}</CardDescription>
        </CardHeader>
        <CardContent className="card-content">
        <Tabs defaultValue="general-access" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-800">
            <TabsTrigger 
              value="general-access" 
              className="text-sm font-medium data-[state=active]:bg-gray-700 data-[state=active]:text-white"
            >
              General Access
            </TabsTrigger>
            <TabsTrigger 
              value="validation-roles" 
              className="text-sm font-medium data-[state=active]:bg-gray-700 data-[state=active]:text-white"
            >
              Validation Roles
            </TabsTrigger>
          </TabsList>
          
          {/* General Access Tab Content */}
          <TabsContent value="general-access">
            <div className="flex justify-between items-center mb-4">
              <div className="font-medium text-lg text-white dark:text-white light:text-[#1E293B]">User Access for {project.name || 'Loading...'}</div>
              <Button 
                className="bg-gray-600 hover:bg-gray-700 text-gray-100 add-user-btn"
                onClick={() => setShowAddUserModal(true)}
              >
                + Add User
              </Button>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-white user-table">
            {loading ? (
              <div className="text-center text-gray-500 py-8">Loading users…</div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">{error}</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">User</th>
                    <th className="text-left p-2 font-medium">Access Level</th>
                    <th className="text-left p-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member: Member, idx: number) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="p-2 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 border border-gray-300 user-avatar">
                          {member.email ? member.email.slice(0,2).toLowerCase() : '?'}
                        </div>
                        <div>
                          <div className="font-medium user-email">{member.name}</div>
                          <div className="text-xs text-muted-foreground user-email-secondary">{member.email}</div>
                        </div>
                      </td>
                      <td className="p-2">
                        {/* Display the role value */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mr-2 ${member.role === 'admin' ? 'bg-purple-100 text-purple-800' : member.role === 'editor' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          {member.role === "admin" ? (
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 13.5L10 19.5L20 7.5" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          ) : member.role === "editor" ? (
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 13.5L10 19.5L20 7.5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          ) : (
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="#2563eb" strokeWidth="2"/></svg>
                          )}
                          {member.role === "editor" ? "Edit Access" : 
                           member.role === "admin" ? "Admin" : "Read Only"}
                        </span>
                      </td>
                      <td className="p-2">
                        <button 
                          className="text-gray-400 hover:text-gray-300 font-medium hover:underline mr-3 change-access-btn"
                          onClick={() => {
                            setSelectedMember(member);
                            setShowChangeAccessModal(true);
                          }}
                        >
                          Change Access
                        </button>
                        <button 
                          className="text-red-400 hover:text-red-300 font-medium hover:underline remove-btn"
                          onClick={() => handleRemoveMember(member.user_id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </TabsContent>
          
          {/* Validation Roles Tab Content */}
          <TabsContent value="validation-roles">
            <div className="flex justify-between items-center mb-4">
              <div className="font-medium text-lg text-white dark:text-white light:text-[#1E293B]">Validation Roles for {project.name || 'Loading...'}</div>
              <Button 
                className="bg-gray-600 hover:bg-gray-700 text-gray-100"
                onClick={() => setShowAssignValidatorModal(true)}
              >
                + Assign Validator
              </Button>
            </div>
            
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-white">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="p-2">User</th>
                    <th className="p-2">Validation Role</th>
                    <th className="p-2">Component Scope</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRoles ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        Loading validation roles...
                      </td>
                    </tr>
                  ) : rolesError ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-red-500">
                        {rolesError}
                      </td>
                    </tr>
                  ) : validationRoles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        No validation roles assigned yet.
                      </td>
                    </tr>
                  ) : (
                    validationRoles.map((role) => {
                      // Determine the role color based on the role name
                      let roleColor = "bg-gray-600";
                      if (role.validation_roles.name === "model_validator") {
                        roleColor = "bg-blue-600";
                      } else if (role.validation_roles.name === "attribute_validator") {
                        roleColor = "bg-green-600";
                      } else if (role.validation_roles.name === "rule_validator") {
                        roleColor = "bg-purple-600";
                      } else if (role.validation_roles.name === "compliance_validator") {
                        roleColor = "bg-violet-600";
                      }

                      // Format the role name for display
                      const roleName = role.validation_roles.name
                        .split("_")
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ");

                      return (
                        <tr key={role.id} className="border-t border-gray-700">
                          <td className="p-2">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold mr-3">
                                {role.users.email.slice(0, 2).toLowerCase()}
                              </div>
                              <div>
                                <div className="font-medium">{role.users.email.split("@")[0]}</div>
                                <div className="text-xs text-gray-400">{role.users.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColor} text-white`}>
                              {roleName}
                            </span>
                          </td>
                          <td className="p-2">
                            {role.component_scope || "All Components"}
                          </td>
                          <td className="p-2">
                            <button 
                              className="text-gray-400 hover:text-gray-300 font-medium hover:underline mr-3"
                              onClick={() => {
                                setSelectedValidationRole(role);
                                setShowAssignValidatorModal(true);
                              }}
                            >
                              Change Role
                            </button>
                            <button 
                              className="text-red-400 hover:text-red-300 font-medium hover:underline"
                              onClick={() => handleRemoveValidationRole(role.id)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <AddUserModal
        projectId={projectId}
        projectName={project.name}
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onUserAdded={() => {
          // Refresh the members list after adding a user
          fetchMembers();
        }}
      />

      {/* Change Access Modal */}
      <ChangeAccessModal
        projectId={projectId}
        projectName={project.name}
        member={selectedMember}
        isOpen={showChangeAccessModal}
        onClose={() => {
          setShowChangeAccessModal(false);
          setSelectedMember(null);
        }}
        onAccessChanged={() => {
          // Refresh the members list after changing access
          fetchMembers();
        }}
      />

      {/* Assign Validator Modal */}
      <AssignValidatorModal
        projectId={projectId}
        projectName={project.name}
        isOpen={showAssignValidatorModal}
        onClose={() => {
          setShowAssignValidatorModal(false);
          setSelectedValidationRole(null);
        }}
        existingRole={selectedValidationRole}
        onValidatorAssigned={() => {
          // Refresh validation roles after assignment
          fetchValidationRoles();
        }}
      />
    </div>
  );

  // Function to fetch members (extracted for reuse)
  function fetchMembers() {
    if (!projectId) return;
    setLoading(true);
    
    // Add a timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    // Use the cache: 'no-store' option to ensure we get fresh data
    fetch(`/api/projects/${projectId}/members?t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          setMembers([]);
        } else {
          console.log('Refreshed members data:', data.members);
          setMembers(data.members);
          setError(null);
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch members');
        setMembers([]);
        setLoading(false);
      });
  }
  
  // Function to fetch validation roles
  function fetchValidationRoles() {
    if (!projectId) return;
    setLoadingRoles(true);
    
    // Add a timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    fetch(`/api/projects/${projectId}/validation-roles?t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setRolesError(data.error);
          setValidationRoles([]);
        } else {
          console.log('Fetched validation roles:', data.userValidationRoles);
          setValidationRoles(data.userValidationRoles || []);
          setRolesError(null);
        }
        setLoadingRoles(false);
      })
      .catch(err => {
        console.error('Error fetching validation roles:', err);
        setRolesError('Failed to fetch validation roles');
        setValidationRoles([]);
        setLoadingRoles(false);
      });
  }
  
  // Function to remove a project member
  function handleRemoveMember(userId: string) {
    if (!projectId || !userId) return;
    
    if (!confirm('Are you sure you want to remove this user from the project?')) {
      return;
    }
    
    setLoading(true);
    
    fetch(`/api/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          // Refresh members list after deletion
          fetchMembers();
        }
      })
      .catch(err => {
        console.error('Error removing project member:', err);
        setError('Failed to remove project member');
        setLoading(false);
      });
  }
  
  // Function to remove a validation role
  function handleRemoveValidationRole(roleId: string) {
    if (!projectId || !roleId) return;
    
    if (!confirm('Are you sure you want to remove this validation role?')) {
      return;
    }
    
    setLoadingRoles(true);
    
    fetch(`/api/projects/${projectId}/validation-roles/${roleId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setRolesError(data.error);
        } else {
          // Refresh validation roles after deletion
          fetchValidationRoles();
        }
      })
      .catch(err => {
        console.error('Error removing validation role:', err);
        setRolesError('Failed to remove validation role');
        setLoadingRoles(false);
      });
  }
}

