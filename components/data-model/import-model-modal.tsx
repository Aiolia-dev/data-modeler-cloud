"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import * as Dialog from "@radix-ui/react-dialog";
import { UploadIcon, XIcon } from "lucide-react";

interface Project {
  id: string;
  name: string;
}

interface ImportModelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onImport: (projectId: string, file: File) => Promise<void>;
}

export const ImportModelModal: React.FC<ImportModelModalProps> = ({
  open,
  onOpenChange,
  projects,
  onImport,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!selectedProjectId) {
      setError("Please select a project");
      return;
    }

    if (!selectedFile) {
      setError("Please select a file to import");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await onImport(selectedProjectId, selectedFile);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import model");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = useCallback(() => {
    setSelectedProjectId("");
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-lg">
          <Dialog.Title className="text-xl font-semibold mb-4">
            Import Data Model
          </Dialog.Title>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="project-select" className="block text-sm font-medium mb-1">
                Select Project
              </label>
              <select
                id="project-select"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium mb-1">
                Upload JSON File
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="file-upload"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 w-full justify-center"
                >
                  <UploadIcon size={16} />
                  {selectedFile ? selectedFile.name : "Choose File"}
                </Button>
              </div>
              {selectedFile && (
                <p className="text-xs text-gray-400 mt-1">
                  Selected file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-md p-3 text-sm text-red-300">
                {error}
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!selectedProjectId || !selectedFile || isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-white rounded-full"></div>
                  Importing...
                </>
              ) : (
                <>
                  <UploadIcon size={16} />
                  Import
                </>
              )}
            </Button>
          </div>
          
          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:text-white focus:outline-none"
              aria-label="Close"
              disabled={isLoading}
            >
              <XIcon size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
