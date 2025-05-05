"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ChevronDown, ChevronRight, Database, FolderIcon, PlusIcon, MoreHorizontal, Edit, Shield, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigation } from "@/context/navigation-context";
import { useProjectRefresh } from "@/context/project-refresh-context";
import { RenameProjectModal } from "@/components/project/rename-project-modal";
import { DeleteProjectModal } from "@/components/project/delete-project-modal";
import { RenameDataModelModal } from "@/components/data-model/rename-data-model-modal";
import { DeleteDataModelModal } from "@/components/data-model/delete-data-model-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface DataModel {
  id: string;
  name: string;
  description: string | null;
  project_id: string;
  version: string;
  created_at: string;
  updated_at: string;
}

interface SidebarNavigationProps {
  collapsed?: boolean;
}

export default function SidebarNavigation({ collapsed }: SidebarNavigationProps) {
  const params = useParams();
  const pathname = usePathname();
  const currentProjectId = params.id as string;
  const currentModelId = params.modelId as string;
  const { expandedProjects, toggleProject, sidebarCollapsed } = useNavigation();
  const { refreshTrigger, dataModelRefreshTrigger, lastRefreshedProjectId } = useProjectRefresh();
  
  // Use the context's collapsed state if no prop is provided
  const isCollapsed = collapsed !== undefined ? collapsed : sidebarCollapsed;

  const [projects, setProjects] = useState<Project[]>([]);
  const [dataModels, setDataModels] = useState<Record<string, DataModel[]>>({});
  const [loading, setLoading] = useState(true);
  const [dataModelsLoading, setDataModelsLoading] = useState<Record<string, boolean>>({});
  const [isSuperuser, setIsSuperuser] = useState(false); // Track loading per project

  // State for project modals
  const [renameProjectModalOpen, setRenameProjectModalOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  
  const [deleteProjectModalOpen, setDeleteProjectModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  // State for data model modals
  const [renameDataModelModalOpen, setRenameDataModelModalOpen] = useState(false);
  const [dataModelToRename, setDataModelToRename] = useState<{id: string, name: string, projectId: string} | null>(null);
  
  const [deleteDataModelModalOpen, setDeleteDataModelModalOpen] = useState(false);
  const [dataModelToDelete, setDataModelToDelete] = useState<{id: string, name: string, projectId: string} | null>(null);

  // Check if current user is a superuser
  useEffect(() => {
    async function checkSuperuser() {
      try {
        const supabase = createClientComponentClient();
        
        // First check if we have an active session to avoid AuthSessionMissingError
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          // No active session, quietly return without errors
          return;
        }
        
        // Now that we know we have a session, get the user
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          // Don't log to console in production to avoid noise
          if (process.env.NODE_ENV === 'development') {
            console.error('Error getting user:', error);
          }
          return;
        }
        
        if (!user) {
          return;
        }
        
        // Check directly from user metadata
        const isSuperuserValue = user.user_metadata && user.user_metadata.is_superuser === 'true';
        setIsSuperuser(isSuperuserValue);
      } catch (err) {
        // Silently handle errors to prevent console noise
        // Only log in development mode
        if (process.env.NODE_ENV === 'development' && 
            !(err instanceof Error && err.message.includes('Auth session missing'))) {
          console.error('Exception checking superuser status:', err);
        }
      }
    }
    
    checkSuperuser();
  }, []);

  // Fetch all projects on initial load and when refreshTrigger changes
  useEffect(() => {
    async function fetchProjectsAndDataModels() {
      console.log('Fetching projects and data models, triggered by refreshTrigger:', refreshTrigger);
      try {
        const response = await fetch("/api/projects");
        if (response.ok) {
          const data = await response.json();
          const projectsList = data.projects || [];
          console.log('Projects fetched successfully:', projectsList.length);
          setProjects(projectsList);
          setLoading(false);
          // Fetch data models for all projects in parallel
          if (projectsList.length > 0) {
            const loadingState: Record<string, boolean> = {};
            projectsList.forEach((project: Project) => {
              loadingState[project.id] = true;
            });
            setDataModelsLoading(loadingState);
            await Promise.all(projectsList.map(async (project: Project) => {
              await fetchDataModels(project.id);
            }));
            
            // Check if we need to expand a newly created project
            const newProjectId = typeof window !== 'undefined' ? localStorage.getItem('newProjectId') : null;
            if (newProjectId) {
              console.log('Auto-expanding newly created project:', newProjectId);
              // Auto-expand the new project
              toggleProject(newProjectId);
              // Clear the flag
              localStorage.removeItem('newProjectId');
            }
          }
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
        setLoading(false);
      }
    }
    
    fetchProjectsAndDataModels();
  }, [toggleProject, refreshTrigger]); // Added refreshTrigger as a dependency
  
  // Separate effect to handle current project and data models
  useEffect(() => {
    if (currentProjectId) {
      // Auto-expand current project in the sidebar
      if (!expandedProjects[currentProjectId]) {
        toggleProject(currentProjectId);
      }
      // Always fetch data models when currentProjectId changes (redundant if already loaded)
      if (!dataModels[currentProjectId] || dataModels[currentProjectId].length === 0) {
        fetchDataModels(currentProjectId);
      }
    }
  }, [currentProjectId, expandedProjects]);
  
  // Listen for data model refresh events
  useEffect(() => {
    if (dataModelRefreshTrigger > 0) {
      console.log('Data model refresh triggered, refreshing data models');
      
      // If we have a specific project ID to refresh
      if (lastRefreshedProjectId) {
        console.log('Refreshing data models for project:', lastRefreshedProjectId);
        fetchDataModels(lastRefreshedProjectId);
        
        // Make sure the project is expanded to show the new data model
        if (!expandedProjects[lastRefreshedProjectId]) {
          toggleProject(lastRefreshedProjectId);
        }
      } 
      // If we're on a project page, refresh that project's data models
      else if (currentProjectId) {
        console.log('Refreshing data models for current project:', currentProjectId);
        fetchDataModels(currentProjectId);
      }
    }
  }, [dataModelRefreshTrigger, lastRefreshedProjectId]);

  // Fetch data models for a project
  async function fetchDataModels(projectId: string) {
    setDataModelsLoading(prev => ({ ...prev, [projectId]: true }));
    try {
      const response = await fetch(`/api/projects/${projectId}/models`);
      if (response.ok) {
        const data = await response.json();
        setDataModels(prev => ({
          ...prev,
          [projectId]: data.dataModels || []
        }));
      }
    } catch (error) {
      console.error(`Error fetching data models for project ${projectId}:`, error);
    } finally {
      setDataModelsLoading(prev => ({ ...prev, [projectId]: false }));
    }
  }

  // Handle project toggle with data model fetching
  const handleToggleProject = async (projectId: string) => {
    toggleProject(projectId);
    
    // Fetch data models if expanding and we don't have them yet
    if (!expandedProjects[projectId] && (!dataModels[projectId] || dataModels[projectId].length === 0)) {
      await fetchDataModels(projectId);
    }
  };

  // Check if a project is the current active project
  const isActiveProject = (projectId: string) => {
    return currentProjectId === projectId;
  };

  // Check if a data model is the current active model
  const isActiveModel = (modelId: string) => {
    return currentModelId === modelId;
  };

  return (
    <div className={cn(
      "h-[calc(100vh-64px)] dark:bg-[#1a1a1a] border-r border-gray-800 dark:border-gray-800 border-gray-200 overflow-y-auto flex flex-col sidebar",
      isCollapsed ? "w-16" : "w-[279px]"
    )}>
      <div className="flex-1">
        <div className="py-2">
          <div className={cn(
            "px-3 py-2 text-sm font-medium text-gray-400 flex items-center",
            isCollapsed && "justify-center"
          )}>
            {!isCollapsed && "PROJECTS"}
          </div>
          
          <ul className="space-y-1">
            {loading ? (
              <li className="px-3 py-2 text-sm text-gray-500">Loading...</li>
            ) : projects.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">No projects found</li>
            ) : (
              projects.map(project => (
                <li key={project.id}>
                  <div className={cn(
                    "flex items-center px-3 py-2 text-sm rounded-md",
                    isActiveProject(project.id) ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800/50",
                    isCollapsed && "justify-center"
                  )}>
                    <button 
                      className="flex items-center flex-1"
                      onClick={() => handleToggleProject(project.id)}
                    >
                      <span className="mr-2">
                        {expandedProjects[project.id] ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </span>
                      <FolderIcon size={16} className="mr-2" />
                      {!isCollapsed && (
                        <span className="truncate">{project.name}</span>
                      )}
                    </button>
                    
                    {!isCollapsed && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="p-1 rounded-sm hover:bg-gray-700 focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal size={14} className="text-gray-400" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-40 bg-gray-800 border-gray-700 text-gray-200">
                          <DropdownMenuItem 
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-700"
                            onClick={() => {
                              setProjectToRename(project);
                              setRenameProjectModalOpen(true);
                            }}
                          >
                            <Edit size={14} />
                            <span>Rename</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 text-rose-400"
                            onClick={() => {
                              setProjectToDelete(project);
                              setDeleteProjectModalOpen(true);
                            }}
                          >
                            <Trash2 size={14} className="text-rose-400" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    
                    {isActiveProject(project.id) && isCollapsed && (
                      <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"></div>
                    )}
                  </div>
                  
                  {/* Data Models submenu */}
                  {expandedProjects[project.id] && !isCollapsed && (
                    <ul className="ml-7 mt-1 space-y-1 border-l border-gray-800 pl-3">
                      {dataModelsLoading[project.id] ? (
                        <li className="py-1 text-xs text-gray-500">Loading...</li>
                      ) : !dataModels[project.id] || dataModels[project.id].length === 0 ? (
                        <li className="py-1 text-xs text-gray-500">No data models</li>
                      ) : (
                        dataModels[project.id].map(model => (
                          <li key={model.id}>
                            <div className="flex items-center justify-between group">
                              <Link 
                                href={`/protected/projects/${project.id}/models/${model.id}`}
                                className={cn(
                                  "flex items-center py-1.5 px-2 text-sm rounded-md flex-grow",
                                  isActiveModel(model.id) ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800/50"
                                )}
                              >
                                <Database size={14} className="mr-2 flex-shrink-0" />
                                <span className="truncate">{model.name.length > 20 ? model.name.slice(0, 20) + '...' : model.name}</span>
                              </Link>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button 
                                      className="p-1 rounded-sm hover:bg-gray-700 focus:outline-none"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal size={12} className="text-gray-400" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="w-40 bg-gray-800 border-gray-700 text-gray-200">
                                    <DropdownMenuItem 
                                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-700"
                                      onClick={() => {
                                        setDataModelToRename({
                                          id: model.id,
                                          name: model.name,
                                          projectId: project.id
                                        });
                                        setRenameDataModelModalOpen(true);
                                      }}
                                    >
                                      <Edit size={14} />
                                      <span>Rename</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 text-red-400"
                                      onClick={() => {
                                        setDataModelToDelete({
                                          id: model.id,
                                          name: model.name,
                                          projectId: project.id
                                        });
                                        setDeleteDataModelModalOpen(true);
                                      }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18"></path>
                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                        <line x1="10" y1="11" x2="10" y2="17"></line>
                                        <line x1="14" y1="11" x2="14" y2="17"></line>
                                      </svg>
                                      <span>Delete</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </li>
                        ))
                      )}
                      
                      {/* Add new data model link */}
                      <li>
                        <Link 
                          href={`/protected/projects/${project.id}/models/new`}
                          className="flex items-center py-1.5 px-2 text-sm text-gray-400 hover:bg-gray-800/50 rounded-md"
                        >
                          <PlusIcon size={14} className="mr-2 flex-shrink-0" />
                          <span className="truncate">New Data Model</span>
                        </Link>
                      </li>
                    </ul>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
      
      {/* New Project button at bottom */}
      <div className="p-3 border-t border-gray-800 space-y-2">
        <Link 
          href="/protected/projects/new"
          className={cn(
            "flex items-center justify-center w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors",
            !isCollapsed && "justify-start"
          )}
        >
          <PlusIcon size={16} className="mr-2" />
          {!isCollapsed && "New Project"}
        </Link>
        
        {/* Admin Dashboard Link - Only visible to superusers */}
        {isSuperuser && (
          <Link 
            href="/protected/admin"
            className={cn(
              "flex items-center justify-center w-full py-2 px-3 bg-blue-900/60 hover:bg-blue-800/70 text-white rounded-md transition-colors",
              !isCollapsed && "justify-start"
            )}
          >
            <Shield size={16} className="mr-2" />
            {!isCollapsed && "Admin Dashboard"}
          </Link>
        )}
      </div>
      
      {/* Rename Project Modal */}
      {projectToRename && (
        <RenameProjectModal
          projectId={projectToRename.id}
          currentName={projectToRename.name}
          open={renameProjectModalOpen}
          onOpenChange={setRenameProjectModalOpen}
          onRename={(newName) => {
            // Update the project name in the local state
            setProjects(projects.map(p => 
              p.id === projectToRename.id ? { ...p, name: newName } : p
            ));
          }}
        />
      )}
      
      {/* Delete Project Modal */}
      {projectToDelete && (
        <DeleteProjectModal
          projectId={projectToDelete.id}
          projectName={projectToDelete.name}
          open={deleteProjectModalOpen}
          onOpenChange={setDeleteProjectModalOpen}
          onDelete={() => {
            // Remove the deleted project from the local state
            setProjects(projects.filter(p => p.id !== projectToDelete.id));
          }}
        />
      )}
      
      {/* Rename Data Model Modal */}
      {dataModelToRename && (
        <RenameDataModelModal
          projectId={dataModelToRename.projectId}
          dataModelId={dataModelToRename.id}
          currentName={dataModelToRename.name}
          open={renameDataModelModalOpen}
          onOpenChange={setRenameDataModelModalOpen}
          onRename={(newName) => {
            // Update the data model name in the local state
            setDataModels(prevDataModels => {
              const updatedModels = { ...prevDataModels };
              if (updatedModels[dataModelToRename.projectId]) {
                updatedModels[dataModelToRename.projectId] = updatedModels[dataModelToRename.projectId].map(m => 
                  m.id === dataModelToRename.id ? { ...m, name: newName } : m
                );
              }
              return updatedModels;
            });
          }}
        />
      )}
      
      {/* Delete Data Model Modal */}
      {dataModelToDelete && (
        <DeleteDataModelModal
          projectId={dataModelToDelete.projectId}
          dataModelId={dataModelToDelete.id}
          dataModelName={dataModelToDelete.name}
          open={deleteDataModelModalOpen}
          onOpenChange={setDeleteDataModelModalOpen}
          onDelete={() => {
            // Remove the deleted data model from the local state
            setDataModels(prevDataModels => {
              const updatedModels = { ...prevDataModels };
              if (updatedModels[dataModelToDelete.projectId]) {
                updatedModels[dataModelToDelete.projectId] = updatedModels[dataModelToDelete.projectId].filter(
                  m => m.id !== dataModelToDelete.id
                );
              }
              return updatedModels;
            });
          }}
        />
      )}
    </div>
  );
}
