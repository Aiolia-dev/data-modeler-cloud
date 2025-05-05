"use client";

import React, { ReactNode } from 'react';
import { usePermissions, PermissionAction } from '@/context/permission-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface PermissionGuardProps {
  action: PermissionAction;
  projectId?: string;
  children: ReactNode;
  fallback?: ReactNode;
  disabledMessage?: string;
  hideCompletely?: boolean;
  renderDisabled?: boolean;
}

/**
 * A component that conditionally renders its children based on user permissions.
 * 
 * @param action - The permission action required (view, edit, create, delete)
 * @param projectId - Optional project ID to check permissions for (defaults to current project)
 * @param children - The content to render if the user has permission
 * @param fallback - Optional content to render if the user doesn't have permission
 * @param disabledMessage - Optional message to show in tooltip when disabled
 * @param hideCompletely - If true, renders nothing when permission is denied (default: false)
 * @param renderDisabled - If true, renders children with disabled styling instead of fallback (default: false)
 */
export function PermissionGuard({
  action,
  projectId,
  children,
  fallback = null,
  disabledMessage = "You don't have permission to perform this action",
  hideCompletely = false,
  renderDisabled = false,
}: PermissionGuardProps) {
  const { hasPermission, loading } = usePermissions();
  
  // While permissions are loading, show nothing or a loading state
  if (loading) {
    return null;
  }
  
  const canPerformAction = hasPermission(action, projectId);
  
  // If user has permission, render the children
  if (canPerformAction) {
    return <>{children}</>;
  }
  
  // If hideCompletely is true, render nothing
  if (hideCompletely) {
    return null;
  }
  
  // If renderDisabled is true, render the children with disabled styling
  if (renderDisabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="opacity-50 cursor-not-allowed pointer-events-none">
              {children}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabledMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // Otherwise, render the fallback
  return <>{fallback}</>;
}
