"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Check } from "lucide-react";
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

export interface AttributeModalData {
  name: string;
  description: string;
  dataType: string;
  isRequired: boolean;
  isUnique: boolean;
  defaultValue?: string;
  length?: number;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  validationStatus?: string;
  validatorId?: string;
}

interface AttributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (attributeData: AttributeModalData) => Promise<void>;
  entityId: string;
  dataModelId?: string;
  projectId?: string;
}

// Mock validation statuses - would be fetched from API in real implementation
const VALIDATION_STATUSES = [
  { id: "1", name: "draft", description: "Initial state", color: "gray" },
  { id: "2", name: "submitted", description: "Submitted for validation", color: "blue" },
  { id: "3", name: "in_review", description: "Currently being reviewed", color: "yellow" },
  { id: "4", name: "changes_requested", description: "Changes requested", color: "orange" },
  { id: "5", name: "approved", description: "Approved by validator", color: "green" },
  { id: "6", name: "rejected", description: "Rejected by validator", color: "red" },
];

// Mock validators - would be fetched from API in real implementation
const MOCK_VALIDATORS = [
  { id: "1", name: "cedric.kerbidi@outscale.com", email: "cedric.kerbidi@outscale.com" },
  { id: "2", name: "cedric.kerbidi+3@gmail.com", email: "cedric.kerbidi+3@gmail.com" },
];

export default function AttributeModal({
  open,
  onOpenChange,
  onSave,
  entityId,
  dataModelId,
  projectId,
}: AttributeModalProps) {
  const [attributeData, setAttributeData] = useState<AttributeModalData>({
    name: "",
    description: "",
    dataType: "varchar",
    isRequired: false,
    isUnique: false,
    validationStatus: "draft",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [validationAction, setValidationAction] = useState<"draft" | "submit">("draft");
  const [validators, setValidators] = useState(MOCK_VALIDATORS);
  const [selectedValidator, setSelectedValidator] = useState<string>("");

  const handleChange = (field: keyof AttributeModalData, value: any) => {
    setAttributeData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Effect to fetch validators when modal opens
  useEffect(() => {
    if (open && dataModelId) {
      // In a real implementation, this would fetch validators from the API
      // fetchValidators(dataModelId);
      console.log("Would fetch validators for data model:", dataModelId);
    }
  }, [open, dataModelId]);

  const handleSubmit = async () => {
    try {
      setError(null);
      
      // Validate required fields
      if (!attributeData.name.trim()) {
        setError("Attribute name is required");
        return;
      }
      
      // Validate validator selection if submitting for validation
      if (validationAction === "submit" && !selectedValidator) {
        setError("Please select a validator");
        return;
      }
      
      setIsSaving(true);
      
      // Prepare data for submission
      const dataToSubmit = {
        ...attributeData,
        validationStatus: validationAction === "submit" ? "submitted" : "draft",
        validatorId: validationAction === "submit" ? selectedValidator : undefined,
      };
      
      try {
        await onSave(dataToSubmit);
        
        // Reset form on successful save
        setAttributeData({
          name: "",
          description: "",
          dataType: "varchar",
          isRequired: false,
          isUnique: false,
          validationStatus: "draft",
        });
        setValidationAction("draft");
        setSelectedValidator("");
        
        onOpenChange(false);
      } catch (saveError) {
        console.error('Error saving attribute:', saveError);
        setError(saveError instanceof Error ? saveError.message : "Failed to save attribute");
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
          <DialogTitle>Add New Attribute</DialogTitle>
          <DialogDescription>
            Add a new attribute to your entity. Fill in the details below.
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
              value={attributeData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="col-span-3"
              placeholder="e.g. first_name, price, status"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dataType" className="text-right">
              Data Type
            </Label>
            <Select
              value={attributeData.dataType}
              onValueChange={(value) => handleChange("dataType", value)}
            >
              <SelectTrigger id="dataType" className="col-span-3">
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
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">
              Description
            </Label>
            <Textarea
              id="description"
              value={attributeData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="col-span-3"
              placeholder="Describe this attribute"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right">Constraints</div>
            <div className="col-span-3 flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRequired"
                  checked={attributeData.isRequired}
                  onCheckedChange={(checked) =>
                    handleChange("isRequired", !!checked)
                  }
                />
                <Label htmlFor="isRequired" className="text-sm font-normal">
                  Required
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isUnique"
                  checked={attributeData.isUnique}
                  onCheckedChange={(checked) =>
                    handleChange("isUnique", !!checked)
                  }
                />
                <Label htmlFor="isUnique" className="text-sm font-normal">
                  Unique
                </Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="defaultValue" className="text-right">
              Default Value
            </Label>
            <Input
              id="defaultValue"
              value={attributeData.defaultValue || ""}
              onChange={(e) => handleChange("defaultValue", e.target.value)}
              className="col-span-3"
              placeholder="e.g. 0, 'Unknown', CURRENT_TIMESTAMP"
            />
          </div>

          {/* Validation Workflow Section */}
          <div className="pt-6 mt-2 border-t border-gray-700">
            <h3 className="text-lg font-medium mb-4">Validation Workflow</h3>
            
            {/* Validation Timeline */}
            <div className="relative flex justify-between items-center mb-6 px-2">
              {/* Connecting Line */}
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-700"></div>
              
              {/* Status Circles */}
              {VALIDATION_STATUSES.map((status, index) => {
                const isActive = status.name === "draft"; // Current status is draft for new attributes
                const isPast = false; // No past statuses for new attributes
                
                return (
                  <div key={status.id} className="flex flex-col items-center z-10">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center
                        ${isActive 
                          ? `bg-${status.color}-500 ring-2 ring-white` 
                          : isPast 
                            ? `bg-${status.color}-500` 
                            : 'bg-gray-700'}`}
                    >
                      {isPast && <Check className="h-5 w-5 text-white" />}
                      {isActive && status.name === "draft" && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className={`text-xs mt-2 ${isActive || isPast ? 'text-white' : 'text-gray-500'}`}>
                      {status.name === "draft" ? "Draft" :
                       status.name === "submitted" ? "Submitted" :
                       status.name === "in_review" ? "In Review" :
                       status.name === "changes_requested" ? "Changes" :
                       status.name === "approved" ? "Approved" :
                       "Rejected"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* After Creation Action */}
            <div className="grid grid-cols-4 items-center gap-4 mb-4">
              <Label htmlFor="validationAction" className="text-right">
                After Creation
              </Label>
              <div className="col-span-3">
                <Select
                  value={validationAction}
                  onValueChange={(value: "draft" | "submit") => setValidationAction(value)}
                >
                  <SelectTrigger id="validationAction" className="w-full">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Keep as Draft</SelectItem>
                    <SelectItem value="submit">Submit for Validation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conditional Validator Selection */}
            {validationAction === "submit" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="validator" className="text-right">
                  Validator
                </Label>
                <div className="col-span-3">
                  <Select
                    value={selectedValidator}
                    onValueChange={setSelectedValidator}
                  >
                    <SelectTrigger id="validator" className="w-full">
                      <SelectValue placeholder="Select validator" />
                    </SelectTrigger>
                    <SelectContent>
                      {validators.map((validator) => (
                        <SelectItem key={validator.id} value={validator.id}>
                          {validator.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
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
            disabled={isSaving}
            className={validationAction === "submit" ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            {isSaving ? "Saving..." : validationAction === "submit" ? "Submit for Validation" : "Save Attribute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
