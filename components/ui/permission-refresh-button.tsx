"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/context/permission-context';
import { RefreshCcw } from 'lucide-react';

interface PermissionRefreshButtonProps {
  className?: string;
}

export function PermissionRefreshButton({ className }: PermissionRefreshButtonProps) {
  const { fetchPermissions, loading } = usePermissions();
  const [refreshing, setRefreshing] = React.useState(false);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPermissions();
    // Add a small delay to ensure the UI updates
    setTimeout(() => {
      setRefreshing(false);
      // Force a page reload to ensure all components re-render with the new permissions
      window.location.reload();
    }, 500);
  };
  
  return (
    <Button 
      variant="outline" 
      size="sm"
      className={className}
      onClick={handleRefresh}
      disabled={loading || refreshing}
    >
      <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
      {refreshing ? 'Refreshing...' : 'Refresh Permissions'}
    </Button>
  );
}
