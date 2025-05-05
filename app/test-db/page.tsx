"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

export default function TestDbPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    
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
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to create project");
      }
      
      setResult(data);
      setName("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFetchProjects = async () => {
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch projects");
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-8 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Database Test</h1>
        <Link href="/auth-test">
          <Button variant="outline">Auth Test</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Create Project</h2>
          <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Test Project"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Project description..."
                rows={3}
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Project"}
            </Button>
          </form>
        </div>

        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Fetch Projects</h2>
          <Button 
            onClick={handleFetchProjects} 
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Loading..." : "Fetch All Projects"}
          </Button>
        </div>
        
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test API Endpoint</h2>
          <div className="flex flex-col gap-4">
            <Button 
              onClick={async () => {
                setIsSubmitting(true);
                setError(null);
                setResult(null);
                
                try {
                  const response = await fetch('/api/test');
                  const data = await response.json();
                  
                  if (!response.ok) {
                    throw new Error(data.error || 'Failed to call test endpoint');
                  }
                  
                  setResult(data);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'An unknown error occurred');
                } finally {
                  setIsSubmitting(false);
                }
              }} 
              disabled={isSubmitting}
              className="w-full mb-2"
            >
              Test GET Endpoint
            </Button>
            
            <Button 
              onClick={async () => {
                setIsSubmitting(true);
                setError(null);
                setResult(null);
                
                try {
                  const response = await fetch('/api/test', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      testData: 'This is a test',
                      timestamp: new Date().toISOString(),
                    }),
                  });
                  
                  const data = await response.json();
                  
                  if (!response.ok) {
                    throw new Error(data.error || 'Failed to call test endpoint');
                  }
                  
                  setResult(data);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'An unknown error occurred');
                } finally {
                  setIsSubmitting(false);
                }
              }} 
              disabled={isSubmitting}
              className="w-full"
              variant="outline"
            >
              Test POST Endpoint
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          <h3 className="font-semibold mb-2">Error</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-muted p-4 rounded-md">
          <h3 className="font-semibold mb-2">Result</h3>
          <pre className="text-xs font-mono bg-background p-3 rounded border overflow-auto max-h-64">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
