"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Search } from "lucide-react";

// Simple modal for UI
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
        <button className="absolute top-3 right-4 text-gray-400 hover:text-gray-700 text-xl" onClick={onClose}>&times;</button>
        {children}
      </div>
    </div>
  );
}


interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  user_count?: number;
}

type Member = {
  name: string;
  initials: string;
  email: string;
  access: 'edit' | 'read';
  superuser?: boolean;
};

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [projectMembers, setProjectMembers] = useState<Record<string, any[]>>({});
  // Modal state
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<(Project & { members: Member[] }) | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try Supabase client session first
        const supabase = createClientComponentClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!error && user) {
          if (user.user_metadata?.is_superuser !== "true") {
            console.log("Access denied: User is not a superuser");
            // Redirect non-superusers to the protected page
            window.location.href = "/protected";
            return;
          }
          setUser(user);
          await fetchProjects();
          setLoading(false);
          return;
        }

        // Try /api/admin/check-user as fallback
        try {
          const response = await fetch('/api/admin/check-user');
          const data = await response.json();
          if (response.ok && data.user) {
            if (data.user.user_metadata?.is_superuser !== "true") {
              throw new Error("Not authorized as superuser");
            }
            setUser(data.user);
            await fetchProjects();
            setLoading(false);
            return;
          }
        } catch (apiError) {
          // Continue to last fallback
        }

        // Try /api/admin/force-auth as last fallback (using email from header if possible)
        let headerEmail = null;
        try {
          const headerElements = document.querySelectorAll('div, span');
          for (let i = 0; i < headerElements.length; i++) {
            const element = headerElements[i];
            if (element.textContent && element.textContent.includes('@')) {
              headerEmail = element.textContent.trim();
              break;
            }
          }
        } catch (e) {
          // Ignore
        }
        if (headerEmail) {
          try {
            const response = await fetch('/api/admin/force-auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: headerEmail })
            });
            const data = await response.json();
            if (response.ok && data.user) {
              if (data.user.user_metadata?.is_superuser !== "true") {
                throw new Error("Not authorized as superuser");
              }
              setUser(data.user);
              await fetchProjects();
              setLoading(false);
              return;
            }
          } catch (forceAuthError) {
            // Ignore
          }
        }
        throw new Error("Authentication error: Auth session missing!");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch projects using the existing API (not direct Supabase query)
  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      // The API should return an array of projects
      setProjects(data.projects || []);
      setFilteredProjects(data.projects || []);
      
      // Fetch project members
      await fetchProjectMembers();
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    }
  };

  // Fetch project members for all projects
  const fetchProjectMembers = async () => {
    try {
      const response = await fetch('/api/projects/members');
      if (!response.ok) throw new Error('Failed to fetch project members');
      const data = await response.json();
      setProjectMembers(data.projectMembers || {});
    } catch (err) {
      console.error("Failed to fetch project members:", err);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter(project => 
        project.name.toLowerCase().includes(query) || 
        (project.description && project.description.toLowerCase().includes(query))
      );
      setFilteredProjects(filtered);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 admin-page">
        <Card className="card rounded-xl shadow-lg overflow-hidden">
          <CardHeader>
            <CardTitle>Admin Area</CardTitle>
            <CardDescription>Manage project access and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <p className="mt-4">Please make sure you are logged in as a superuser.</p>
          </CardContent>
          <div className="p-6 pt-0">
            <Button 
              className="w-full" 
              onClick={() => window.location.href = "/sign-in"}
            >
              Go to Sign In
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl admin-page">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white dark:text-white light:text-[#2D3644]">Admin Area</h1>
        <Button 
          variant="outline" 
          onClick={() => window.location.href = '/protected'}
          className="bg-gray-800 hover:bg-gray-700 text-white border-gray-700 hover:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white dark:border-gray-700 dark:hover:border-gray-600"
        >
          Back to Projects
        </Button>
      </div>
      <Card className="mb-8 bg-gray-900 border border-gray-800 shadow-lg rounded-xl overflow-hidden">
        <CardContent className="p-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-white">Manage Project Access</h2>
            <p className="text-gray-400 mb-6">Select a project to manage user access and permissions</p>

            {/* Search input */}
            <div className="relative mb-8">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Search projects..."
                className="pl-10 bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md search-box"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            
            {/* Projects list - match main dashboard grid layout, with mocked members */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                {searchQuery ? "No projects match your search" : "No projects found"}
              </div>
            ) : (
              filteredProjects.map(project => (
                <div
                  key={project.id}
                  className="bg-[#1F2937] border border-gray-700 rounded-xl p-6 h-full flex flex-col hover:border-blue-500 hover:shadow-lg transition-all project-card"
                >
                  <h3 className="text-xl font-medium mb-2 group-hover:text-primary">{project.name}</h3>
                  {project.description && (
                    <p className="text-muted-foreground mb-4 flex-grow">{project.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4 mb-4">
                    {/* Real user avatars */}
                    {projectMembers[project.id]?.slice(0, 3).map((member, idx) => (
                      <div key={idx} className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white border border-gray-600 shadow-sm user-avatar">
                        {member.email ? member.email.slice(0, 2).toLowerCase() : '?'}
                      </div>
                    ))}
                    {projectMembers[project.id] && (
                      <span className="text-xs text-gray-400 self-center ml-2">
                        {projectMembers[project.id].length} {projectMembers[project.id].length === 1 ? 'user' : 'users'}
                      </span>
                    )}
                    {!projectMembers[project.id] && (
                      <span className="text-xs text-gray-400 self-center ml-2">0 users</span>
                    )}
                  </div>
                  <div className="flex justify-end mt-auto">
                    <Link href={`/admin-direct/projects/${project.id}/access`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600 hover:border-blue-500 manage-access-btn"
                      >
                        Manage Access
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
            {/* Optionally, add a create project card if needed for admin */}
          </div>

          {/* Manage Access Modal */}
          <Modal open={showAccessModal} onClose={() => setShowAccessModal(false)}>
            {selectedProject && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">User Access for {selectedProject.name}</h2>
                    <div className="text-muted-foreground text-sm">{selectedProject.description}</div>
                  </div>
                  <Button className="ml-6">+ Add User</Button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">User</th>
                        <th className="text-left p-2 font-medium">Access Level</th>
                        <th className="text-left p-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProject.members.map((member, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="p-2 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 border border-gray-300">
                              {member.initials}
                            </div>
                            <div>
                              <div className="font-medium">{member.name}</div>
                              <div className="text-xs text-muted-foreground">{member.email}</div>
                            </div>
                          </td>
                          <td className="p-2">
                            {member.access === "edit" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-semibold mr-2">
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 13.5L10 19.5L20 7.5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                Edit Access
                              </span>
                            )}
                            {member.access === "read" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="#2563eb" strokeWidth="2"/></svg>
                                Read Only
                              </span>
                            )}
                            {member.superuser && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="#a21caf" strokeWidth="2"/></svg>
                                Superuser
                              </span>
                            )}
                          </td>
                          <td className="p-2">
                            <button className="text-blue-600 font-medium hover:underline mr-3">Change Access</button>
                            <button className="text-red-500 font-medium hover:underline">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Modal>
          </div>
        </CardContent>
      </Card>
      
      {/* User information section (simplified) */}
      <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-lg shadow-md flex justify-between items-center user-info">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white border border-gray-600 mr-3">
            {user?.email ? user.email.slice(0, 2).toLowerCase() : '?'}
          </div>
          <span className="text-gray-300">{user?.email}</span>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-gray-800 hover:bg-gray-700 text-white border-gray-700 hover:border-gray-600"
          onClick={async () => {
            const supabase = createClientComponentClient();
            await supabase.auth.signOut();
            window.location.href = "/sign-in";
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
