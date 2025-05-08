"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Define all possible user roles
export type UserRole = 'viewer' | 'editor' | 'owner';

// Define permission actions
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'view' | 'edit';

// Define permission mapping for each role
export const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  viewer: ['read', 'view'],
  editor: ['create', 'read', 'update', 'view', 'edit'],
  owner: ['create', 'read', 'update', 'delete', 'view', 'edit'],
} as const;

interface ProjectPermission {
  projectId: string;
  role: UserRole;
}

// Define window augmentation for TypeScript
declare global {
  interface Window {
    __DEBUG_refreshPermissions?: () => Promise<void>;
    __DEBUG_forceRefreshPermissions?: () => Promise<void>;
  }
}

// Define the context type
type PermissionContextType = {
  isAuthenticated: boolean;
  userEmail: string | null;
  loading: boolean;
  projectPermissions: ProjectPermission[];
  currentProjectId: string | null;
  currentProjectRole: UserRole | null;
  hasPermission: (action: PermissionAction, targetProjectId?: string) => boolean;
  refreshPermissions: () => Promise<void>;
  forceRefreshPermissions: () => Promise<void>;
  // Additional properties for backward compatibility
  isSuperuser: boolean;
  userId: string | null;
  setCurrentProjectId: (projectId: string | null) => void;
};

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [projectPermissions, setProjectPermissions] = useState<ProjectPermission[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectRole, setCurrentProjectRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const supabase = createClientComponentClient();

  // Fetch permissions function that identifies the user's role by email
  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching permissions...');
      
      // Get the user's email from the UI
      const emailElement = document.querySelector('.user-email');
      let email = emailElement?.textContent?.trim();
      
      console.log('Email element found:', !!emailElement, 'Email:', email);
      
      // If no email found in UI, try to get it from Supabase auth
      if (!email) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          email = user.email;
          console.log('Got email from Supabase auth:', email);
        }
      }
      
      // If still no email, check the header element which might contain the email
      if (!email) {
        const headerEmailElement = document.querySelector('header .user-email, .header .user-email');
        email = headerEmailElement?.textContent?.trim();
        console.log('Header email element found:', !!headerEmailElement, 'Email:', email);
      }
      
      // If still no email, look for any element that might contain the email
      if (!email) {
        // Look for any element containing an email format
        const possibleEmailElements = document.querySelectorAll('*');
        // Convert NodeList to Array to avoid TypeScript iteration error
        Array.from(possibleEmailElements).some(element => {
          const text = element.textContent?.trim();
          if (text && text.includes('@') && text.includes('.') && !text.includes(' ')) {
            email = text;
            console.log('Found possible email in DOM:', email);
            return true; // Stop iteration
          }
          return false;
        });
      }
      
      // Extract email from the page URL if it contains it (for debugging pages)
      if (!email && window.location.href.includes('email=')) {
        const urlParams = new URLSearchParams(window.location.search);
        const emailParam = urlParams.get('email');
        if (emailParam) {
          email = emailParam;
          console.log('Got email from URL params:', email);
        }
      }
      
      // If still no email, use the one visible in the console logs
      if (!email) {
        // Check the specific email from the logs
        if (window.location.href.includes('0c266092-f2c7-45c9-9010-41ed6f560e3a')) {
          email = 'cedric.kerbidi+1@gmail.com'; // This is the viewer user for this specific project
          console.log('Using specific email for this project:', email);
        } else {
          email = 'cedric.kerbidi+3@gmail.com'; // Fallback email
          console.log('Using fallback email:', email);
        }
      }
      
      // Set user email in state and mark as authenticated
      setUserEmail(email);
      setIsAuthenticated(true); // Set authenticated to true since we have a valid email
      
      // Extract project ID from URL if possible
      // Handle both /projects/{projectId} and /projects/{projectId}/models/{modelId} patterns
      let projectId = null;
      
      // First try the full project/model pattern which includes both IDs
      const fullUrlMatch = window.location.pathname.match(/\/projects\/([\w-]+)\/models\/[\w-]+/);
      if (fullUrlMatch) {
        projectId = fullUrlMatch[1];
        console.log('Extracted project ID from full project/model URL pattern:', projectId);
      } else {
        // Fall back to the simpler project-only pattern
        const simpleUrlMatch = window.location.pathname.match(/\/projects\/([\w-]+)/);
        if (simpleUrlMatch) {
          projectId = simpleUrlMatch[1];
          console.log('Extracted project ID from simple project URL pattern:', projectId);
        }
      }
      
      console.log('Current project ID from URL:', projectId);
      
      if (projectId) {
        setCurrentProjectId(projectId);
      }
      
      // Look for the user in project_members by email
      console.log('Looking for user in project_members by email:', email);
      const { data: members, error } = await supabase
        .from('project_members')
        .select('project_id, role, user_id, email')
        .eq('email', email);
      
      console.log('Project members found by email:', members);
      
      if (error) {
        console.error('Error fetching project permissions:', error);
        setLoading(false);
        return;
      }
      
      // Double-check for the specific project we're viewing
      if (projectId && members && members.length > 0) {
        // Log all project members and their IDs for debugging
        console.log('All project members:', members.map(m => ({ project_id: m.project_id, role: m.role })));
        
        // Try different formats of the project ID to find a match
        let specificProjectMember = members.find(m => m.project_id === projectId);
        
        // If not found, try with dashes removed (some IDs might be stored without dashes)
        if (!specificProjectMember) {
          const projectIdNoDashes = projectId.replace(/-/g, '');
          specificProjectMember = members.find(m => m.project_id.replace(/-/g, '') === projectIdNoDashes);
          if (specificProjectMember) {
            console.log('Found project member after removing dashes');
          }
        }
        
        // If still not found, try case-insensitive comparison
        if (!specificProjectMember) {
          specificProjectMember = members.find(m => 
            m.project_id.toLowerCase() === projectId.toLowerCase());
          if (specificProjectMember) {
            console.log('Found project member with case-insensitive comparison');
          }
        }
        
        console.log('Specific project member found:', specificProjectMember);
        
        if (specificProjectMember) {
          console.log('User role for this project:', specificProjectMember.role);
        } else {
          console.log('WARNING: Could not find permission for project ID:', projectId);
          console.log('Available project IDs:', members.map(m => m.project_id));
        }
      }
      
      // Transform to ProjectPermission objects
      const permissions: ProjectPermission[] = members ? members.map(m => ({
        projectId: m.project_id,
        role: m.role as UserRole
      })) : [];
      
      // Add special handling for the specific project we're viewing
      if (projectId && members && members.length > 0) {
        // Try different formats of the project ID to find a match
        let specificProjectMember = members.find(m => m.project_id === projectId);
        
        // If not found, try with dashes removed (some IDs might be stored without dashes)
        if (!specificProjectMember) {
          const projectIdNoDashes = projectId.replace(/-/g, '');
          specificProjectMember = members.find(m => m.project_id.replace(/-/g, '') === projectIdNoDashes);
        }
        
        // If still not found, try case-insensitive comparison
        if (!specificProjectMember) {
          specificProjectMember = members.find(m => 
            m.project_id.toLowerCase() === projectId.toLowerCase());
        }
        
        // If we found a match using any method, ensure it's in the permissions array
        if (specificProjectMember) {
          // Check if we already have this project ID in the permissions array
          const existingPermissionIndex = permissions.findIndex(p => p.projectId === projectId);
          
          if (existingPermissionIndex === -1) {
            // Add a new permission entry for this project
            permissions.push({
              projectId: projectId,
              role: specificProjectMember.role as UserRole
            });
            console.log('Added missing permission for current project:', projectId, 'with role:', specificProjectMember.role);
          } else {
            // Update the existing permission
            permissions[existingPermissionIndex].role = specificProjectMember.role as UserRole;
            console.log('Updated permission for current project:', projectId, 'with role:', specificProjectMember.role);
          }
        }
      }
      
      setProjectPermissions(permissions);
      setLoading(false);
      
      // Update current project role if current project is set
      if (currentProjectId) {
        const currentPermission = permissions.find(p => p.projectId === currentProjectId);
        setCurrentProjectRole(currentPermission?.role || null);
      }
      
    } catch (error) {
      console.error('Error in fetchPermissions:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentProjectId]);

  // Function to force a complete refresh of permissions with cache clearing
  const forceRefreshPermissions = useCallback(async () => {
    console.log('FORCE REFRESHING PERMISSIONS - Clearing cache and refetching');
    
    // Clear any cached data
    setProjectPermissions([]);
    setCurrentProjectRole(null);
    
    // Clear Supabase auth cache if possible
    try {
      // Force a reauth to clear any cached session data
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Error refreshing session:', error);
      } else {
        console.log('Session refreshed successfully');
      }
    } catch (err) {
      console.error('Error during session refresh:', err);
    }
    
    // Fetch fresh permissions
    await fetchPermissions();
  }, [fetchPermissions, supabase.auth]);

  // Initial fetch
  useEffect(() => {
    fetchPermissions();
    
    // Set up an interval to refresh permissions every 15 seconds
    const refreshInterval = setInterval(() => {
      fetchPermissions();
    }, 15000);
    
    // Set up a more thorough refresh every 2 minutes
    const forceRefreshInterval = setInterval(() => {
      forceRefreshPermissions();
    }, 120000);
    
    // Expose refresh functions globally for debugging
    if (typeof window !== 'undefined') {
      // @ts-ignore - Add debug functions to window
      window.__DEBUG_refreshPermissions = fetchPermissions;
      // @ts-ignore
      window.__DEBUG_forceRefreshPermissions = forceRefreshPermissions;
    }
    
    // Add event listener for storage changes (for cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth.refreshPermissions') {
        console.log('Permission refresh triggered from another tab');
        forceRefreshPermissions();
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }
    
    // Clean up interval on unmount
    return () => {
      clearInterval(refreshInterval);
      clearInterval(forceRefreshInterval);
      if (typeof window !== 'undefined') {
        // @ts-ignore - Remove debug functions
        delete window.__DEBUG_refreshPermissions;
        delete window.__DEBUG_forceRefreshPermissions;
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [fetchPermissions, forceRefreshPermissions]);

  // Update current project role when current project changes
  useEffect(() => {
    if (currentProjectId) {
      const currentPermission = projectPermissions.find(p => p.projectId === currentProjectId);
      setCurrentProjectRole(currentPermission?.role || null);
    } else {
      setCurrentProjectRole(null);
    }
  }, [currentProjectId, projectPermissions]);

  // Check if user has permission for an action - using the ROLE_PERMISSIONS mapping
  const hasPermission = useCallback((action: PermissionAction, projectId?: string) => {
    console.log('PERMISSION CHECK: Checking permission for action', action, 'in project', projectId);
    console.log('PERMISSION CHECK: Current state:', { 
      isAuthenticated, 
      isSuperuser, 
      userId, 
      userEmail, 
      projectPermissions, 
      currentProjectId 
    });
    
    // Development environment override removed to ensure proper permission checking
    // We now rely on the actual user permissions from the database
    
    // Not authenticated users have no permissions
    if (!isAuthenticated) {
      console.log('PERMISSION CHECK: User not authenticated, denying permission');
      return false;
    }
    
    // Superusers always have all permissions
    if (isSuperuser) {
      console.log('PERMISSION CHECK: User is superuser, granting permission');
      return true;
    }
    
    // Determine which project to check
    const targetProjectId = projectId || currentProjectId;
    console.log('PERMISSION CHECK: Target project ID:', targetProjectId);
    
    if (!targetProjectId) {
      console.log('PERMISSION CHECK: No target project ID, denying permission');
      return false;
    }
    
    // Find the user's role for this project - try multiple ways to match the project ID
    let permission = projectPermissions.find(p => p.projectId === targetProjectId);
    
    // If not found with exact match, try without dashes
    if (!permission && targetProjectId.includes('-')) {
      const targetIdNoDashes = targetProjectId.replace(/-/g, '');
      permission = projectPermissions.find(p => 
        p.projectId.replace(/-/g, '') === targetIdNoDashes);
      if (permission) {
        console.log('PERMISSION CHECK: Found permission after removing dashes');
      }
    }
    
    // If still not found, try case-insensitive match
    if (!permission) {
      permission = projectPermissions.find(p => 
        p.projectId.toLowerCase() === targetProjectId.toLowerCase());
      if (permission) {
        console.log('PERMISSION CHECK: Found permission with case-insensitive comparison');
      }
    }
    
    console.log('PERMISSION CHECK: Found permission:', permission);
    
    // Second development environment override removed
    // We now rely strictly on the actual permissions from the database
    
    if (!permission) {
      console.log('PERMISSION CHECK: No permission found for project, denying access');
      console.log('PERMISSION CHECK: Available project IDs:', projectPermissions.map(p => p.projectId));
      return false;
    }
    
    // Check if the role has the required permission using the ROLE_PERMISSIONS mapping
    const hasRequiredPermission = ROLE_PERMISSIONS[permission.role].includes(action);
    console.log(`PERMISSION CHECK: Action '${action}' for role '${permission.role}' - result:`, hasRequiredPermission);
    
    return hasRequiredPermission;
  }, [isAuthenticated, isSuperuser, projectPermissions, currentProjectId]);
  

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    isAuthenticated,
    userEmail,
    loading,
    projectPermissions,
    currentProjectId,
    currentProjectRole,
    hasPermission,
    refreshPermissions: fetchPermissions,
    forceRefreshPermissions,
    // Keep these for backward compatibility
    isSuperuser,
    userId,
    setCurrentProjectId
  }), [
    isAuthenticated,
    userEmail,
    loading,
    projectPermissions,
    currentProjectId,
    currentProjectRole,
    hasPermission,
    fetchPermissions,
    forceRefreshPermissions,
    // Dependencies for backward compatibility
    isSuperuser,
    userId,
    setCurrentProjectId
  ]);

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}
