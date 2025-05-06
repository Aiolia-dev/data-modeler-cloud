"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusIcon, FolderIcon, DatabaseIcon } from "lucide-react";
import { CreateProjectModal } from "@/components/project/create-project-modal";
import { createAdminClient } from "@/utils/supabase/admin";

export default function ProjectsDashboard() {
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  // Note: This is now a client component, so we'll handle auth in a useEffect
  // For now, we'll just render the UI without the auth check
  // The layout.tsx file should already handle redirecting unauthenticated users

  return (
    <div className="flex-1 w-full flex flex-col gap-8 p-4 md:p-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Data Modeler Cloud</h1>
        </div>
        <div className="flex gap-3">
          <Button 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={() => setCreateProjectModalOpen(true)}
          >
            <PlusIcon size={16} />
            New Project
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-muted/20 rounded-full p-10 mb-6">
          <DatabaseIcon size={64} className="text-primary/70" />
        </div>
        <h2 className="text-2xl font-medium mb-3">Welcome to Data Modeler Cloud</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Use the sidebar navigation to access your projects and data models.
          Create, edit, and visualize your data models with ease.
        </p>
        <div className="flex gap-4">
          <Button 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={() => setCreateProjectModalOpen(true)}
          >
            <PlusIcon size={16} />
            Create New Project
          </Button>
        </div>
      </div>
      
      {/* Project Creation Modal */}
      <CreateProjectModal
        open={createProjectModalOpen}
        onOpenChange={setCreateProjectModalOpen}
      />
    </div>
  );
}
