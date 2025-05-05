"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useProjectRefresh } from "@/context/project-refresh-context";

export default function NewDataModelPage() {
  // Use the useParams hook instead of directly accessing params
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const { triggerDataModelRefresh } = useProjectRefresh();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Data model name is required");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Call API endpoint to create data model
      const response = await fetch(`/api/projects/${projectId}/models`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          project_id: projectId
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create data model");
      }
      
      const { dataModel } = await response.json();
      
      // Trigger a refresh of the sidebar to show the new data model
      console.log('Data model created, triggering refresh for project:', projectId);
      triggerDataModelRefresh(projectId);
      
      // Redirect to the new data model page
      router.push(`/protected/projects/${projectId}/models/${dataModel.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-8 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Link href={`/protected/projects/${projectId}`} className="hover:opacity-70">
          <ArrowLeftIcon size={20} />
        </Link>
        <h1 className="text-3xl font-bold">Create New Data Model</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Data Model Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer Database"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your data model..."
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
              {isSubmitting ? "Creating..." : "Create Data Model"}
            </Button>
            <Link href={`/protected/projects/${projectId}`}>
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
