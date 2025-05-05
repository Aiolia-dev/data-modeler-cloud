"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useProjectRefresh } from "@/context/project-refresh-context";
import { createProject } from "@/utils/supabase/data-modeler";

export default function NewProjectPage() {
  const router = useRouter();
  const { triggerRefresh } = useProjectRefresh();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Call API endpoint to create project
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create project");
      }
      
      const { project } = await response.json();
      
      // Store the new project ID in localStorage for auto-expansion
      localStorage.setItem('newProjectId', project.id);
      
      // Trigger a refresh of the projects list in the sidebar
      triggerRefresh();
      console.log('Project created, triggering refresh');
      
      // Redirect to the protected page where the user will see the newly created project in the sidebar
      router.push('/protected');
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-8 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Link href="/protected" className="hover:opacity-70">
          <ArrowLeftIcon size={20} />
        </Link>
        <h1 className="text-3xl font-bold">Create New Project</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Data Model"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project..."
              rows={4}
            />
          </div>

          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Project"}
            </Button>
            <Link href="/protected">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
