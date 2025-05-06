"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EntityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (entityData: EntityFormData) => Promise<void>;
  initialData?: EntityFormData;
  isEditing?: boolean;
  // Add available entities for join relationships
  availableEntities?: Entity[];
  // Add available referentials for categorization
  availableReferentials?: Referential[];
}

interface Entity {
  id: string;
  name: string;
  description?: string | null;
}

interface Referential {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
}

export interface EntityFormData {
  name: string;
  description: string;
  primaryKeyType: "auto_increment" | "uuid" | "custom" | "composite";
  primaryKeyName: string;
  // New fields for join entity support
  entityType: "standard" | "join";
  joinEntities?: string[]; // Array of entity IDs to join
  // Referential categorization
  referential_id?: string | null; // ID of the referential this entity belongs to
}

export function EntityModal({
  open,
  onOpenChange,
  onSave,
  initialData,
  isEditing = false,
  availableEntities = [],
  availableReferentials = [],
}: EntityModalProps) {
  const [formData, setFormData] = useState<EntityFormData>(
    initialData || {
      name: "",
      description: "",
      primaryKeyType: "auto_increment",
      primaryKeyName: "id",
      entityType: "standard",
      joinEntities: [],
      referential_id: null,
    }
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<Entity[]>([]);

  // Initialize selected entities from initialData.joinEntities when the modal opens
  useEffect(() => {
    if (open && initialData?.joinEntities && initialData.joinEntities.length > 0 && availableEntities.length > 0) {
      // Find the entities that match the IDs in initialData.joinEntities
      const preSelectedEntities = initialData.joinEntities
        .map(id => availableEntities.find(entity => entity.id === id))
        .filter((entity): entity is Entity => entity !== undefined);
      
      if (preSelectedEntities.length > 0) {
        setSelectedEntities(preSelectedEntities);
        
        // Also update the formData.joinEntities to ensure it has the same values
        // This is crucial for form validation when submitting
        setFormData(prev => ({
          ...prev,
          joinEntities: preSelectedEntities.map(entity => entity.id)
        }));
      }
    }
  }, [open, initialData?.joinEntities, availableEntities]);

  // Generate name for join entity based on selected entities
  useEffect(() => {
    if (formData.entityType === "join" && selectedEntities.length > 0) {
      const joinName = selectedEntities.map(e => e.name).join("_");
      setFormData(prev => ({ ...prev, name: joinName }));
      
      // For join entities, also update the description
      if (selectedEntities.length > 1) {
        const description = `Junction table linking ${selectedEntities.map(e => e.name).join(", ")} entities`;
        setFormData(prev => ({ ...prev, description }));
      }
      
      // For join entities, set composite primary key
      if (selectedEntities.length > 1) {
        const compositePkName = `Composite (${selectedEntities.map(e => `id_${e.name.toLowerCase()}`).join(", ")})`;
        setFormData(prev => ({
          ...prev,
          primaryKeyType: "composite",
          primaryKeyName: compositePkName
        }));
      }
    }
  }, [selectedEntities, formData.entityType]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string | null) => {
    setFormData((prev) => {
      // Special handling for entityType
      if (name === "entityType" && typeof value === 'string') {
        // Reset selected entities when switching between standard and join
        if (value === "standard" && prev.entityType === "join") {
          setSelectedEntities([]);
          return {
            ...prev,
            [name]: value as "standard" | "join",
            joinEntities: [],
            // Reset name and description if they were auto-generated
            name: "",
            description: "",
            // Reset primary key to default
            primaryKeyType: "auto_increment",
            primaryKeyName: "id",
          };
        }
        // Just update the entity type otherwise
        return { ...prev, [name]: value as "standard" | "join" };
      }
      
      // For referential_id, handle null value
      if (name === "referential_id") {
        return { ...prev, [name]: value };
      }
      
      // For other fields, just update the value
      return { ...prev, [name]: value as string };
    });
  };
  
  const handleAddEntity = (entityId: string) => {
    const entity = availableEntities.find(e => e.id === entityId);
    if (entity && !selectedEntities.some(e => e.id === entityId)) {
      const updatedEntities = [...selectedEntities, entity];
      setSelectedEntities(updatedEntities);
      setFormData(prev => ({
        ...prev,
        joinEntities: updatedEntities.map(e => e.id)
      }));
    }
  };
  
  const handleRemoveEntity = (entityId: string) => {
    const updatedEntities = selectedEntities.filter(e => e.id !== entityId);
    setSelectedEntities(updatedEntities);
    setFormData(prev => ({
      ...prev,
      joinEntities: updatedEntities.map(e => e.id)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      if (!formData.name.trim()) {
        throw new Error("Entity name is required");
      }
      
      // For debugging
      console.log('Submitting form data:', formData);
      console.log('Selected entities:', selectedEntities);
      
      // Use either formData.joinEntities or selectedEntities.map(e => e.id) for validation
      const joinEntityIds = formData.joinEntities || selectedEntities.map(e => e.id);
      
      if (formData.entityType === "join" && (!joinEntityIds || joinEntityIds.length < 2)) {
        throw new Error("Join entities require at least two entities to be selected");
      }
      
      // Ensure formData has the latest joinEntities before submission
      const updatedFormData = {
        ...formData,
        joinEntities: joinEntityIds
      };
      

      await onSave(updatedFormData);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entity");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Entity" : "Create New Entity"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the details of this entity."
                : "Add a new entity to your data model."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Entity Type Toggle */}
            {!isEditing && (
              <div className="mb-4">
                <Label className="block mb-2">Entity Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={formData.entityType === "standard" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => handleSelectChange("entityType", "standard")}
                  >
                    Standard Entity
                  </Button>
                  <Button
                    type="button"
                    variant={formData.entityType === "join" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => handleSelectChange("entityType", "join")}
                  >
                    Join Entity
                  </Button>
                </div>
              </div>
            )}

            {/* Join Entity Selection - Only shown for join entity type */}
            {formData.entityType === "join" && (
              <div className="mb-4">
                <Label className="block mb-2">Join Relationship</Label>
                <div className="border border-gray-700 rounded-md p-4 mb-4">
                  <Label className="block mb-2">Select Entities to Join</Label>
                  {selectedEntities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedEntities.map(entity => (
                        <div 
                          key={entity.id} 
                          className="flex items-center bg-muted px-3 py-1 rounded-md"
                        >
                          <span>{entity.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 ml-2"
                            onClick={() => handleRemoveEntity(entity.id)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Select
                    onValueChange={handleAddEntity}
                    value=""
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an entity to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEntities
                        .filter(e => !selectedEntities.some(se => se.id === e.id))
                        .map(entity => (
                          <SelectItem key={entity.id} value={entity.id}>
                            {entity.name}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="mt-4 w-full"
                    onClick={() => {
                      const selectElement = document.querySelector('[id^="radix-"]') as HTMLElement;
                      if (selectElement) selectElement.click();
                    }}
                  >
                    + Add Entity
                  </Button>
                </div>
              </div>
            )}

            {/* Name field - For join entities, it's auto-generated and shown after entity selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <div className="col-span-3 relative">
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={cn(
                    "w-full",
                    formData.entityType === "join" && selectedEntities.length > 0 && "border-dashed"
                  )}
                  placeholder="e.g. User, Product, Order"
                  autoFocus={formData.entityType !== "join"}
                  disabled={formData.entityType === "join" && selectedEntities.length > 0}
                />
                {formData.entityType === "join" && selectedEntities.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Auto-generated from selected entities
                  </div>
                )}
              </div>
            </div>

            {/* Description field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={cn(
                  "col-span-3",
                  formData.entityType === "join" && selectedEntities.length > 1 && "border-dashed"
                )}
                placeholder="Describe the purpose of this entity"
                rows={3}
                disabled={formData.entityType === "join" && selectedEntities.length > 1}
              />
            </div>

            {/* Primary Key section */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="primaryKeyType" className="text-right">
                Primary Key
              </Label>
              <div className="col-span-3">
                <Select
                  value={formData.primaryKeyType}
                  onValueChange={(value) => 
                    handleSelectChange("primaryKeyType", value)
                  }
                  disabled={formData.entityType === "join" && selectedEntities.length > 1}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary key type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto_increment">Auto Increment Integer</SelectItem>
                    <SelectItem value="uuid">UUID/GUID</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="composite">Composite Key</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="primaryKeyName" className="text-right">
                Key Name
              </Label>
              <Input
                id="primaryKeyName"
                name="primaryKeyName"
                value={formData.primaryKeyName}
                onChange={handleChange}
                className={cn(
                  "col-span-3",
                  (formData.primaryKeyType === "composite" || 
                   (formData.entityType === "join" && selectedEntities.length > 1)) && "border-dashed"
                )}
                placeholder="e.g. id, user_id"
                disabled={formData.primaryKeyType === "composite" || 
                          (formData.entityType === "join" && selectedEntities.length > 1)}
              />
            </div>

            {/* Referential dropdown */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="referential" className="text-right">
                Referential
              </Label>
              <div className="col-span-3">
                <Select
                  value={formData.referential_id || "none"}
                  onValueChange={(value) => 
                    handleSelectChange("referential_id", value === "none" ? null : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a referential (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableReferentials.map(referential => (
                      <SelectItem key={referential.id} value={referential.id}>
                        {referential.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground mt-1">
                  Optional: Group this entity within a referential category
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-destructive text-sm mb-4">{error}</div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? "Saving..." : isEditing ? "Update Entity" : "Create Entity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
