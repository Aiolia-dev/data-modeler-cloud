"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { usePermissions } from '@/context/permission-context';
import { AttributeData } from './AttributeTooltip';

// Data types available for attributes
const DATA_TYPES = [
  { value: "integer", label: "Integer" },
  { value: "bigint", label: "Big Integer" },
  { value: "decimal", label: "Decimal" },
  { value: "float", label: "Float" },
  { value: "double", label: "Double" },
  { value: "varchar", label: "Varchar" },
  { value: "char", label: "Char" },
  { value: "text", label: "Text" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "datetime", label: "DateTime" },
  { value: "timestamp", label: "Timestamp" },
  { value: "boolean", label: "Boolean" },
  { value: "uuid", label: "UUID" },
  { value: "json", label: "JSON" },
  { value: "jsonb", label: "JSONB" },
  { value: "array", label: "Array" },
  { value: "enum", label: "Enum" },
];

export interface QuickEditAttributeData {
  id: string;
  name: string;
  description: string;
  dataType: string;
  isRequired: boolean;
  isUnique: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencedEntity?: string;
}

interface QuickEditAttributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attribute: AttributeData | null;
  entityName: string;
  onSave: (attributeData: QuickEditAttributeData) => Promise<void>;
}

export default function QuickEditAttributeModal({
  open,
  onOpenChange,
  attribute,
  entityName,
  onSave,
}: QuickEditAttributeModalProps) {
  const { hasPermission, currentProjectRole, projectPermissions, currentProjectId, isAuthenticated } = usePermissions();
  
  // Extract project ID directly from URL to ensure we have the correct one
  const extractProjectIdFromUrl = () => {
    if (typeof window !== 'undefined') {
      // First try the full project/model pattern
      const fullUrlMatch = window.location.pathname.match(/\/projects\/([\w-]+)\/models\/[\w-]+/);
      if (fullUrlMatch) {
        return fullUrlMatch[1];
      }
      
      // Fall back to the simpler project-only pattern
      const simpleUrlMatch = window.location.pathname.match(/\/projects\/([\w-]+)/);
      if (simpleUrlMatch) {
        return simpleUrlMatch[1];
      }
    }
    return null;
  };
  
  // Get the project ID directly from the URL
  const urlProjectId = extractProjectIdFromUrl();
  
  // For debugging purposes
  useEffect(() => {
    if (open) {
      console.log('QuickEditAttributeModal - Permission Debug:', {
        currentProjectRole,
        projectPermissions,
        currentProjectId,
        urlProjectId,
        isAuthenticated
      });
    }
  }, [open, currentProjectRole, projectPermissions, currentProjectId, isAuthenticated, urlProjectId]);
  
  // Check if the user has edit permission
  // The permission context has been updated to properly check permissions
  // and allow editing in development/localhost environment
  // Pass the extracted project ID directly to hasPermission to ensure it uses the correct one
  const canEditAttributes = hasPermission('edit', urlProjectId || undefined);
  
  const [attributeData, setAttributeData] = useState<QuickEditAttributeData>({
    id: '',
    name: '',
    description: '',
    dataType: 'varchar',
    isRequired: false,
    isUnique: false,
    isPrimaryKey: false,
    isForeignKey: false,
  });
  
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when attribute changes
  useEffect(() => {
    if (attribute) {
      setAttributeData({
        id: attribute.id,
        name: attribute.name,
        description: attribute.description || '',
        dataType: attribute.dataType,
        isRequired: attribute.isRequired || attribute.is_required || false,
        isUnique: attribute.isUnique || attribute.is_unique || false,
        isPrimaryKey: attribute.isPrimaryKey || attribute.is_primary_key || false,
        isForeignKey: attribute.isForeignKey || attribute.is_foreign_key || false,
        referencedEntity: attribute.referencedEntity,
      });
    }
  }, [attribute]);

  const handleChange = (field: keyof QuickEditAttributeData, value: any) => {
    setAttributeData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      
      // Validate required fields
      if (!attributeData.name.trim()) {
        setError("Attribute name is required");
        return;
      }
      
      setIsSaving(true);
      
      // Call the onSave callback with the updated attribute data
      await onSave(attributeData);
      
      // Close the modal
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving attribute:", error);
      setError("Failed to save attribute");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {attributeData.isPrimaryKey ? "Edit Primary Key" : 
             attributeData.isForeignKey ? "Edit Foreign Key" : "Edit Attribute"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Modify the properties of <span className="font-medium text-white">{attributeData.name}</span> in {entityName}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
          <div className="grid gap-6 py-4">
            {error && (
              <div className="text-destructive text-sm mb-2 border border-destructive bg-destructive/10 p-2 rounded">{error}</div>
            )}
            
            {/* Attribute Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right font-medium">
                Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="name"
                  value={attributeData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  disabled={!canEditAttributes || attributeData.isPrimaryKey}
                  className={!canEditAttributes || attributeData.isPrimaryKey ? "opacity-70" : ""}
                  placeholder="Attribute name"
                />
                {attributeData.isPrimaryKey && (
                  <p className="text-xs text-purple-400 mt-1">
                    Primary key name cannot be changed
                  </p>
                )}
              </div>
            </div>

            {/* Data Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dataType" className="text-right font-medium">
                Data Type
              </Label>
              <div className="col-span-3">
                <Select
                  value={attributeData.dataType}
                  onValueChange={(value) => handleChange("dataType", value)}
                  disabled={!canEditAttributes || attributeData.isPrimaryKey || attributeData.isForeignKey}
                >
                  <SelectTrigger 
                    id="dataType" 
                    className={!canEditAttributes || attributeData.isPrimaryKey || attributeData.isForeignKey ? "opacity-70" : ""}
                  >
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {attributeData.isForeignKey && (
                  <div className="flex items-center mt-1 text-xs text-blue-400 bg-blue-950 bg-opacity-30 p-1.5 rounded border border-blue-800">
                    <span className="font-medium">References:</span> 
                    <span className="ml-1">{attributeData.referencedEntity}</span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {!attributeData.isPrimaryKey && !attributeData.isForeignKey && "Choose the appropriate data type for this attribute"}
                </div>
              </div>
            </div>

            {/* Constraints */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right font-medium pt-0.5">Constraints</Label>
              <div className="col-span-3 space-y-3 bg-gray-900 p-3 rounded border border-gray-800">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isRequired"
                    checked={attributeData.isRequired}
                    onCheckedChange={(checked) => handleChange("isRequired", checked)}
                    disabled={!canEditAttributes || attributeData.isPrimaryKey}
                    className={!canEditAttributes || attributeData.isPrimaryKey ? "opacity-70" : ""}
                  />
                  <Label
                    htmlFor="isRequired"
                    className={`text-sm font-normal ${!canEditAttributes || attributeData.isPrimaryKey ? "opacity-70" : ""}`}
                  >
                    Required
                  </Label>
                  <span className="text-xs text-gray-500 ml-2">(NOT NULL)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isUnique"
                    checked={attributeData.isUnique}
                    onCheckedChange={(checked) => handleChange("isUnique", checked)}
                    disabled={!canEditAttributes || attributeData.isPrimaryKey}
                    className={!canEditAttributes || attributeData.isPrimaryKey ? "opacity-70" : ""}
                  />
                  <Label
                    htmlFor="isUnique"
                    className={`text-sm font-normal ${!canEditAttributes || attributeData.isPrimaryKey ? "opacity-70" : ""}`}
                  >
                    Unique
                  </Label>
                  <span className="text-xs text-gray-500 ml-2">(UNIQUE constraint)</span>
                </div>
                {attributeData.isPrimaryKey && (
                  <div className="mt-2 text-xs text-purple-400 bg-purple-950 bg-opacity-30 p-1.5 rounded border border-purple-800">
                    Primary keys are automatically required and unique
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right font-medium pt-2">
                Description
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="description"
                  value={attributeData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  disabled={!canEditAttributes}
                  className={!canEditAttributes ? "opacity-70" : ""}
                  placeholder="Describe the purpose of this attribute"
                  rows={3}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Add a clear description to document this attribute's purpose
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving || !canEditAttributes}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
