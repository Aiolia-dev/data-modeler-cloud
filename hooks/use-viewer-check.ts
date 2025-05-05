"use client";

import { usePermissions } from "@/context/permission-context";
import { useState, useEffect, useMemo } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * A hook that returns whether the current user is a viewer for a specific project
 * This is useful for disabling UI elements for viewers
 */
export function useViewerCheck(projectId?: string) {
  const { hasPermission, loading } = usePermissions();
  
  // Use the same permission check that the PermissionButton component uses
  // Check if the user has 'edit' permission for the project
  const canEdit = useMemo(() => {
    if (loading) return false;
    return hasPermission('edit', projectId);
  }, [hasPermission, projectId, loading]);
  
  // Return true if the user is a viewer (cannot edit)
  return !canEdit;
}
