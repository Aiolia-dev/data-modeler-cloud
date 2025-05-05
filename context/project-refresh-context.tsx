"use client";

import React, { createContext, useContext, useState } from 'react';

interface ProjectRefreshContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
  dataModelRefreshTrigger: number;
  triggerDataModelRefresh: (projectId?: string) => void;
  lastRefreshedProjectId: string | null;
}

const ProjectRefreshContext = createContext<ProjectRefreshContextType>({
  refreshTrigger: 0,
  triggerRefresh: () => {},
  dataModelRefreshTrigger: 0,
  triggerDataModelRefresh: () => {},
  lastRefreshedProjectId: null
});

export const useProjectRefresh = () => useContext(ProjectRefreshContext);

export function ProjectRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dataModelRefreshTrigger, setDataModelRefreshTrigger] = useState(0);
  const [lastRefreshedProjectId, setLastRefreshedProjectId] = useState<string | null>(null);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const triggerDataModelRefresh = (projectId?: string) => {
    setDataModelRefreshTrigger(prev => prev + 1);
    if (projectId) {
      setLastRefreshedProjectId(projectId);
    }
  };

  return (
    <ProjectRefreshContext.Provider value={{ 
      refreshTrigger, 
      triggerRefresh, 
      dataModelRefreshTrigger, 
      triggerDataModelRefresh,
      lastRefreshedProjectId 
    }}>
      {children}
    </ProjectRefreshContext.Provider>
  );
}
