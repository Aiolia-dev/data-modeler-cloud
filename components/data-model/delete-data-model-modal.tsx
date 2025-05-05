"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteDataModelModalProps {
  projectId: string;
  dataModelId: string;
  dataModelName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

export function DeleteDataModelModal({
  projectId,
  dataModelId,
  dataModelName,
  open,
  onOpenChange,
  onDelete,
}: DeleteDataModelModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setError(null);
    }
  }, [open]);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/models/${dataModelId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete data model");
      }
      
      // Call the onDelete callback
      onDelete();
      
      // Close the modal
      onOpenChange(false);
    } catch (err) {
      console.error("Error deleting data model:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle size={18} />
            Delete Data Model
          </DialogTitle>
          <DialogDescription className="text-gray-400 pt-2">
            Are you sure you want to delete <span className="font-medium text-white">{dataModelName}</span>?
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-3">
          <div className="bg-red-950/30 border border-red-900/50 rounded-md p-3 text-sm text-red-300">
            <p>This action is <strong>irreversible</strong>. Deleting this data model will permanently remove:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>All entities in this data model</li>
              <li>All attributes of those entities</li>
              <li>All relationships between entities</li>
              <li>Any associated diagrams or layouts</li>
            </ul>
          </div>
          
          {error && (
            <div className="mt-3 text-sm text-red-500 bg-red-950/20 p-2 rounded">
              {error}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="border-gray-700 text-gray-300"
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete Data Model"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
