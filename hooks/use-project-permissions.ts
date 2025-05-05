"use client";

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { usePermissions } from '@/context/permission-context';

/**
 * Hook to automatically set the current project ID based on URL params
 * and provide permission-related utilities for the current project
 */
export function useProjectPermissions() {
  const params = useParams();
  const projectId = params.id as string;
  const { 
    setCurrentProjectId, 
    currentProjectRole, 
    isSuperuser, 
    hasPermission, 
    loading 
  } = usePermissions();
  
  // Set the current project ID when the component mounts or when the URL changes
  useEffect(() => {
    if (projectId) {
      setCurrentProjectId(projectId);
    }
    
    // Clean up when the component unmounts
    return () => {
      setCurrentProjectId(null);
    };
  }, [projectId, setCurrentProjectId]);
  
  // Helper functions specific to the current project
  const canEdit = isSuperuser || hasPermission('edit');
  const canDelete = isSuperuser || hasPermission('delete');
  const canCreate = isSuperuser || hasPermission('create');
  
  return {
    projectId,
    role: currentProjectRole,
    isSuperuser,
    loading,
    canEdit,
    canDelete,
    canCreate,
    hasPermission
  };
}
