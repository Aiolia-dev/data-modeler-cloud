"use client";

import React, { ReactNode } from 'react';
import { usePermissions, PermissionAction } from '@/context/permission-context';

interface PermissionWrapperProps {
  action: PermissionAction;
  projectId?: string;
  children: (canPerform: boolean) => ReactNode;
}

/**
 * A wrapper component that provides permission status to its children through a render prop.
 * This allows for more flexible UI handling based on permissions.
 * 
 * @param action - The permission action required (view, edit, create, delete)
 * @param projectId - Optional project ID to check permissions for (defaults to current project)
 * @param children - A render function that receives the permission status
 */
export function PermissionWrapper({
  action,
  projectId,
  children,
}: PermissionWrapperProps) {
  const { hasPermission, loading } = usePermissions();
  
  // While permissions are loading, assume no permission
  if (loading) {
    return <>{children(false)}</>;
  }
  
  const canPerformAction = hasPermission(action, projectId);
  
  return <>{children(canPerformAction)}</>;
}
