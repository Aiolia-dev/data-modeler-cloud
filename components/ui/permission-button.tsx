"use client";

import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { usePermissions, PermissionAction } from '@/context/permission-context';

interface PermissionButtonProps extends ButtonProps {
  action: PermissionAction;
  projectId?: string;
  disabledMessage?: string;
}

/**
 * A button component that is automatically disabled if the user doesn't have permission to perform the action.
 * 
 * @param action - The permission action required (view, edit, create, delete)
 * @param projectId - Optional project ID to check permissions for (defaults to current project)
 * @param disabledMessage - Optional message to show in tooltip when disabled
 * @param children - The button content
 */
export function PermissionButton({
  action,
  projectId,
  disabledMessage = "You don't have permission to perform this action",
  children,
  ...props
}: PermissionButtonProps) {
  const { hasPermission, loading } = usePermissions();
  
  // Log the permission check for debugging
  console.log(`PERMISSION BUTTON: action=${action}, projectId=${projectId}`);
  // If still loading, show a disabled button
  if (loading) {
    return (
      <Button {...props} disabled className="opacity-50 cursor-not-allowed">
        {children}
      </Button>
    );
  }
  
  const canPerformAction = hasPermission(action, projectId);
  
  // Log the final state for debugging
  console.log(`PERMISSION BUTTON STATE: canPerformAction=${canPerformAction}, projectId=${projectId}, action=${action}`);
  
  // If user has permission, enable the button. Otherwise, disable it.
  if (canPerformAction) {
    console.log('PERMISSION BUTTON RENDER: Rendering enabled button');
    return <Button {...props}>{children}</Button>;
  } else {
    console.log('PERMISSION BUTTON RENDER: Rendering disabled button with tooltip');
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              {...props} 
              disabled 
              className="opacity-50 cursor-not-allowed"
            >
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabledMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
}
