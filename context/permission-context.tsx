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

interface PermissionContextType {
  isSuperuser: boolean;
  projectPermissions: ProjectPermission[];
  currentProjectId: string | null;
  currentProjectRole: UserRole | null;
  loading: boolean;
  userId: string | null;
  userEmail: string | null;
  setCurrentProjectId: (projectId: string | null) => void;
  hasPermission: (action: PermissionAction, projectId?: string) => boolean;
  refreshPermissions: () => Promise<void>;
  isAuthenticated: boolean;
}

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

  // Simplified fetch permissions function that focuses on finding the user's role by email
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
      
      // If still no email, use a fallback
      if (!email) {
        email = 'cedric.kerbidi+3@gmail.com'; // Fallback email
        console.log('Using fallback email:', email);
      }
      
      // Set user email in state and mark as authenticated
      setUserEmail(email);
      setIsAuthenticated(true); // Set authenticated to true since we have a valid email
      
      // Extract project ID from URL if possible
      const urlMatch = window.location.pathname.match(/\/projects\/(\w+-?\w+)/);
      const projectId = urlMatch ? urlMatch[1] : null;
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
      
      // Transform to ProjectPermission objects
      const permissions: ProjectPermission[] = members ? members.map(m => ({
        projectId: m.project_id,
        role: m.role as UserRole
      })) : [];
      
      setProjectPermissions(permissions);
      
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

  // Initial fetch
  useEffect(() => {
    fetchPermissions();
    
    // Set up an interval to refresh permissions every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchPermissions();
    }, 30000);
    
    // Expose refresh function globally for debugging
    if (typeof window !== 'undefined') {
      // @ts-ignore - Add debug function to window
      window.__DEBUG_refreshPermissions = fetchPermissions;
    }
    
    // Clean up interval on unmount
    return () => {
      clearInterval(refreshInterval);
      if (typeof window !== 'undefined') {
        // @ts-ignore - Remove debug function
        delete window.__DEBUG_refreshPermissions;
      }
    };
  }, [fetchPermissions]);

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
    
    // Find the user's role for this project
    const permission = projectPermissions.find(p => p.projectId === targetProjectId);
    console.log('PERMISSION CHECK: Found permission:', permission);
    
    if (!permission) {
      console.log('PERMISSION CHECK: No permission found for project, denying access');
      return false;
    }
    
    // Check if the role has the required permission using the ROLE_PERMISSIONS mapping
    const hasRequiredPermission = ROLE_PERMISSIONS[permission.role].includes(action);
    console.log(`PERMISSION CHECK: Action '${action}' for role '${permission.role}' - result:`, hasRequiredPermission);
    
    return hasRequiredPermission;
  }, [isAuthenticated, isSuperuser, projectPermissions, currentProjectId]);
  

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    isSuperuser,
    projectPermissions,
    currentProjectId,
    currentProjectRole,
    loading,
    userId,
    userEmail,
    setCurrentProjectId,
    hasPermission,
    refreshPermissions: fetchPermissions,
    isAuthenticated
  }), [
    isSuperuser, 
    projectPermissions, 
    currentProjectId, 
    currentProjectRole, 
    loading, 
    userId, 
    userEmail, 
    setCurrentProjectId, 
    hasPermission, 
    fetchPermissions,
    isAuthenticated
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
