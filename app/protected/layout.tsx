"use client";

import React from "react";
import { usePathname } from "next/navigation";
import SidebarNavigation from "@/components/navigation/sidebar-navigation";
import { MenuIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NavigationProvider, useNavigation } from "@/context/navigation-context";
import { ProjectRefreshProvider } from "@/context/project-refresh-context";
import AdminHeaderButtons from "@/components/navigation/admin-header-buttons";
import UserAuthButtons from "@/components/navigation/user-auth-buttons";


function ProtectedLayoutContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { sidebarCollapsed, toggleSidebar } = useNavigation();
  const pathname = usePathname();
  
  // Don't show sidebar on login or reset password pages
  const isAuthPage = pathname === "/login" || pathname.includes("/reset-password");
  
  if (isAuthPage) {
    return <>{children}</>;
  }
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - hidden on mobile by default, fixed position */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out",
        sidebarCollapsed ? "w-16" : "w-[294px]", /* Increased from w-64 (256px) to 294px to fix truncated menu icons */
        "hidden lg:block overflow-y-auto"
      )}>
        <SidebarNavigation collapsed={sidebarCollapsed} />
      </div>
      
      {/* Mobile sidebar - shown when toggled */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out",
        "lg:hidden",
        "w-[294px]", /* Increased from w-64 (256px) to 294px to match desktop sidebar */
        sidebarCollapsed ? "-translate-x-full" : "translate-x-0"
      )}>
        <SidebarNavigation collapsed={false} />
      </div>
      
      {/* Main content */}
      <div className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out overflow-y-auto",
        sidebarCollapsed ? "lg:ml-16" : "lg:ml-[294px]" /* Adjusted margin to match the increased sidebar width */
      )}>
        {/* Top navigation bar */}
        <div className="h-16 border-b border-gray-800 flex items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden mr-2"
            onClick={toggleSidebar}
          >
            {sidebarCollapsed ? <MenuIcon size={20} /> : <XIcon size={20} />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={toggleSidebar}
          >
            <MenuIcon size={20} />
          </Button>
          
          <div className="flex-1 px-4">
            {/* Current path breadcrumb could go here */}
          </div>
          
          <div className="flex items-center space-x-4">
            <AdminHeaderButtons />
            <UserAuthButtons />
          </div>
        </div>
        
        {/* Page content */}
        <div className="flex-1">
          <div className="pl-[20px] pr-4 py-4">
            {children}
          </div>
        </div>
        
        {/* Debug Tools removed */}
      </div>
    </div>
  );
}

export default function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <NavigationProvider>
      <ProjectRefreshProvider>
        <ProtectedLayoutContent>{children}</ProtectedLayoutContent>
      </ProjectRefreshProvider>
    </NavigationProvider>
  );
}
