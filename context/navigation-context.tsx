"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface NavigationContextType {
  expandedProjects: Record<string, boolean>;
  toggleProject: (projectId: string) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Load sidebar state from localStorage on client-side
  useEffect(() => {
    const savedSidebarState = localStorage.getItem("sidebarCollapsed");
    if (savedSidebarState) {
      setSidebarCollapsed(JSON.parse(savedSidebarState));
    }
    
    const savedExpandedState = localStorage.getItem("expandedProjects");
    if (savedExpandedState) {
      setExpandedProjects(JSON.parse(savedExpandedState));
    }
  }, []);
  
  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);
  
  // Save expanded projects state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("expandedProjects", JSON.stringify(expandedProjects));
  }, [expandedProjects]);
  
  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };
  
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };
  
  return (
    <NavigationContext.Provider 
      value={{ 
        expandedProjects, 
        toggleProject, 
        sidebarCollapsed, 
        toggleSidebar 
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
