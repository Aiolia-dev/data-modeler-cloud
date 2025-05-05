"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteProjectModalProps {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

export function DeleteProjectModal({
  projectId,
  projectName,
  open,
  onOpenChange,
  onDelete,
}: DeleteProjectModalProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete project");
      }

      // Call the onDelete callback to update the UI
      onDelete();
      
      // Close the modal
      onOpenChange(false);
      
      // Redirect to the projects page
      router.push("/protected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Project
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-semibold">{projectName}</span>?
            This action cannot be undone and will permanently delete the project and all its data models, entities, and attributes.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md">
            {error}
          </div>
        )}
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting ? "Deleting..." : "Delete Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
