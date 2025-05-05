"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Entity {
  id: string;
  name: string;
}

export interface ForeignKeyData {
  name: string;
  description: string;
  referencedEntityId: string;
  dataType: string;
  isRequired: boolean;
}

interface ForeignKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (foreignKeyData: ForeignKeyData) => Promise<void>;
  entityId: string;
  dataModelId: string;
  projectId: string;
}

export default function ForeignKeyModal({
  open,
  onOpenChange,
  onSave,
  entityId,
  dataModelId,
  projectId,
}: ForeignKeyModalProps) {
  const [foreignKeyData, setForeignKeyData] = useState<ForeignKeyData>({
    name: "",
    description: "Foreign key reference",
    referencedEntityId: "",
    dataType: "integer", // Default for foreign keys
    isRequired: true, // Foreign keys are typically required
  });
  
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all entities in the current data model
  useEffect(() => {
    async function fetchEntities() {
      try {
        setLoading(true);
        console.log('Fetching entities with:', { projectId, dataModelId, entityId });
        
        // Check if we have valid IDs
        if (!projectId || !dataModelId) {
          console.error('Invalid project or data model ID', { projectId, dataModelId });
          throw new Error('Invalid project or data model ID');
        }
        
        // Directly fetch from the entities table instead of using the model endpoint
        const response = await fetch(`/api/entities?dataModelId=${dataModelId}`);
        
        if (!response.ok) {
          console.error('Failed to fetch entities, status:', response.status);
          throw new Error("Failed to fetch entities");
        }
        
        const data = await response.json();
        console.log('Fetched entities:', data);
        
        // Filter out the current entity
        const otherEntities = data.entities.filter((e: Entity) => e.id !== entityId);
        console.log('Other entities:', otherEntities);
        setEntities(otherEntities);
      } catch (err) {
        console.error("Error fetching entities:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    }
    
    if (open) {
      fetchEntities();
    }
  }, [open, projectId, dataModelId, entityId]);

  const handleChange = (field: keyof ForeignKeyData, value: any) => {
    setForeignKeyData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      
      // Validate required fields
      if (!foreignKeyData.name.trim()) {
        setError("Foreign key name is required");
        return;
      }
      
      if (!foreignKeyData.referencedEntityId) {
        setError("You must select a referenced entity");
        return;
      }
      
      setIsSaving(true);
      
      try {
        await onSave(foreignKeyData);
        
        // Reset form on successful save
        setForeignKeyData({
          name: "",
          description: "Foreign key reference",
          referencedEntityId: "",
          dataType: "integer",
          isRequired: true,
        });
        
        onOpenChange(false);
      } catch (saveError) {
        console.error('Error saving foreign key:', saveError);
        setError(saveError instanceof Error ? saveError.message : "Failed to save foreign key");
      }
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Foreign Key</DialogTitle>
          <DialogDescription>
            Create a foreign key reference to another entity in this data model.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={foreignKeyData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="col-span-3"
              placeholder="e.g. customer_id, parent_category_id"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="referencedEntity" className="text-right">
              Referenced Entity
            </Label>
            <Select
              value={foreignKeyData.referencedEntityId}
              onValueChange={(value) => handleChange("referencedEntityId", value)}
              disabled={loading || entities.length === 0}
            >
              <SelectTrigger id="referencedEntity" className="col-span-3">
                <SelectValue placeholder={loading ? "Loading entities..." : entities.length === 0 ? "No other entities available" : "Select an entity"} />
              </SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">
              Description
            </Label>
            <Textarea
              id="description"
              value={foreignKeyData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="col-span-3"
              placeholder="Describe this foreign key relationship"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right">Data Type</div>
            <div className="col-span-3 text-gray-400">
              Integer (fixed for foreign keys)
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right">Required</div>
            <div className="col-span-3 text-gray-400">
              Yes (fixed for foreign keys)
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isSaving || loading || entities.length === 0}
          >
            {isSaving ? "Saving..." : "Add Foreign Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
