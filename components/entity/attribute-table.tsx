"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PermissionButton } from "@/components/ui/permission-button";
import { useViewerCheck } from "@/hooks/use-viewer-check";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrashIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react";
import { AttributeFormData } from "./attribute-form";
import ForeignKeyModal, { ForeignKeyData } from "./foreign-key-modal";

const DATA_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "varchar", label: "Varchar" },
  { value: "char", label: "Char" },
  { value: "integer", label: "Integer" },
  { value: "bigint", label: "Big Integer" },
  { value: "decimal", label: "Decimal" },
  { value: "float", label: "Float" },
  { value: "double", label: "Double" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "datetime", label: "DateTime" },
  { value: "timestamp", label: "Timestamp" },
  { value: "uuid", label: "UUID" },
  { value: "json", label: "JSON" },
  { value: "jsonb", label: "JSONB" },
  { value: "array", label: "Array" },
  { value: "enum", label: "Enum" },
];

interface AttributeTableProps {
  attributes: AttributeFormData[];
  onAttributeChange: (attributes: AttributeFormData[]) => void;
  onAddAttribute: () => void;
  onAddForeignKey: (foreignKeyData: ForeignKeyData) => void;
  entityId: string;
  dataModelId: string;
  projectId: string;
}

export default function AttributeTable({
  attributes,
  onAttributeChange,
  onAddAttribute,
  onAddForeignKey,
  entityId,
  dataModelId,
  projectId
}: AttributeTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [showForeignKeyModal, setShowForeignKeyModal] = useState(false);
  const [editingDataTypeIndex, setEditingDataTypeIndex] = useState<number | null>(null);
  const dataTypeDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const [attributesWithRules, setAttributesWithRules] = useState<Record<string, boolean>>({});
  
  // Check if the user is a viewer for this project
  const isViewer = useViewerCheck(projectId);

  // Effect to handle clicking outside the data type dropdown
  React.useEffect(() => {
    if (editingDataTypeIndex === null) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        dataTypeDropdownRef.current &&
        !dataTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setEditingDataTypeIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editingDataTypeIndex]);

  // Effect to fetch rules for attributes
  useEffect(() => {
    const fetchRulesForAttributes = async () => {
      try {
        // Create a map to track which attributes have rules
        const rulesMap: Record<string, boolean> = {};
        
        // Fetch rules for the entity
        const response = await fetch(`/api/rules?entityId=${entityId}`);
        if (!response.ok) {
          console.error('Error fetching rules for attributes');
          return;
        }
        
        const rules = await response.json();
        
        // Mark attributes that have rules
        rules.forEach((rule: any) => {
          if (rule.attribute_id) {
            rulesMap[rule.attribute_id] = true;
          }
        });
        
        setAttributesWithRules(rulesMap);
      } catch (error) {
        console.error('Error fetching rules for attributes:', error);
      }
    };
    
    if (entityId) {
      fetchRulesForAttributes();
    }
  }, [entityId]);

  const handleRemoveAttribute = async (index: number) => {
    const attribute = attributes[index];
    
    // If the attribute doesn't have an ID, it's a new attribute that hasn't been saved to the database yet
    if (!attribute.id) {
      const newAttributes = [...attributes];
      newAttributes.splice(index, 1);
      onAttributeChange(newAttributes);
      return;
    }
    
    try {
      // Call the API to delete the attribute from the database
      const response = await fetch(`/api/attributes/${attribute.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error deleting attribute:', errorData);
        throw new Error(errorData.error || 'Failed to delete attribute');
      }
      
      // If the API call was successful, update the UI
      const newAttributes = [...attributes];
      newAttributes.splice(index, 1);
      onAttributeChange(newAttributes);
      
      console.log(`Attribute ${attribute.id} deleted successfully`);
    } catch (error) {
      console.error('Error deleting attribute:', error);
      alert('Failed to delete attribute. Please try again.');
    }
  };

  const handleAttributeChange = async (index: number, field: string, value: unknown, saveImmediately: boolean = false) => {
    const newAttributes = [...attributes];
    
    // Handle special case for primary key
    if (field === "isPrimaryKey" && value === true) {
      // If this attribute is being set as primary key, unset any other primary keys
      newAttributes.forEach((attr, i) => {
        if (i !== index && attr.isPrimaryKey) {
          attr.isPrimaryKey = false;
        }
      });
    }
    
    // Update the field
    (newAttributes[index] as any)[field] = value;
    
    // If this is a primary key, also set it as required and unique
    if (field === "isPrimaryKey" && value === true) {
      newAttributes[index].isRequired = true;
      newAttributes[index].isUnique = true;
    }
    
    // Update the state
    onAttributeChange(newAttributes);
    
    // If saveImmediately is true, save the attribute to the database
    if (saveImmediately && newAttributes[index].id) {
      try {
        const response = await fetch(`/api/attributes/${newAttributes[index].id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newAttributes[index].name,
            description: newAttributes[index].description,
            dataType: newAttributes[index].dataType,
            isRequired: newAttributes[index].isRequired,
            isUnique: newAttributes[index].isUnique,
            isPrimaryKey: newAttributes[index].isPrimaryKey,
            isForeignKey: newAttributes[index].isForeignKey,
            defaultValue: newAttributes[index].defaultValue,
            length: newAttributes[index].length,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error updating attribute:', errorData);
          throw new Error(errorData.error || 'Failed to update attribute');
        }
        
        console.log(`Attribute ${newAttributes[index].id} updated successfully`);
      } catch (error) {
        console.error('Error updating attribute:', error);
        // Don't show an alert here to avoid disrupting the user experience
      }
    }
  };

  const toggleRowExpanded = (index: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSaveForeignKey = async (foreignKeyData: ForeignKeyData): Promise<void> => {
    setShowForeignKeyModal(false);
    onAddForeignKey(foreignKeyData);
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center w-full">
        <h3 className="text-lg font-medium">Attributes</h3>
        <div className="flex space-x-2">
          <PermissionButton
            variant="outline"
            size="sm"
            onClick={onAddAttribute}
            action="create"
            projectId={projectId}
            disabledMessage="Viewers cannot add attributes"
          >
            Add Attribute
          </PermissionButton>
          <PermissionButton
            variant="outline"
            size="sm"
            onClick={() => setShowForeignKeyModal(true)}
            action="create"
            projectId={projectId}
            disabledMessage="Viewers cannot add foreign keys"
          >
            Add Foreign Key
          </PermissionButton>
        </div>
      </div>
      
      {/* Foreign Key Modal */}
      <ForeignKeyModal
        open={showForeignKeyModal}
        onOpenChange={setShowForeignKeyModal}
        onSave={handleSaveForeignKey}
        entityId={entityId}
        dataModelId={dataModelId}
        projectId={projectId}
      />

      {attributes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No attributes defined yet.
        </div>
      ) : (
        <div className="border border-gray-700 rounded-md overflow-hidden bg-gray-900 w-full">
          <table className="w-full table-fixed">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="w-10 px-4 py-3"></th>
                <th className="text-left px-4 py-3 font-medium text-gray-200 w-1/4">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-200 w-1/6">Data Type</th>
                <th className="text-center px-4 py-3 font-medium text-gray-200 w-1/12">Required</th>
                <th className="text-center px-4 py-3 font-medium text-gray-200 w-1/12">Unique</th>
                <th className="text-center px-4 py-3 font-medium text-gray-200 w-1/12">Primary Key</th>
                <th className="text-center px-4 py-3 font-medium text-gray-200 w-1/12">Foreign Key</th>
                <th className="text-center px-4 py-3 font-medium text-gray-200 w-1/6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attributes.map((attribute, index) => (
                <React.Fragment key={`attribute-${index}`}>
                  <tr 
                    className={`border-t border-gray-700 ${expandedRows[index] ? 'bg-gray-800' : attribute.isPrimaryKey ? 'bg-gray-800/50' : 'hover:bg-gray-800/30'}`}
                  >
                    <td className="px-4 py-3 text-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => toggleRowExpanded(index)}
                      >
                        {expandedRows[index] ? (
                          <ChevronDownIcon size={16} />
                        ) : (
                          <ChevronRightIcon size={16} />
                        )}
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="group relative">
                        <div 
                          className={`py-1 px-2 rounded ${!isViewer && !attribute.isPrimaryKey ? 'cursor-text group-hover:bg-gray-800' : 'cursor-not-allowed'} text-gray-100 min-h-8 flex items-center`}
                          onClick={(e) => {
                            // Only allow editing if not a viewer and not a primary key
                            if (!isViewer && !attribute.isPrimaryKey) {
                              const target = e.currentTarget;
                              const input = target.nextElementSibling as HTMLInputElement;
                              if (input) {
                                target.classList.add('hidden');
                                input.classList.remove('hidden');
                                input.focus();
                              }
                            }
                          }}
                          title={isViewer ? "You don't have permission to edit attributes" : attribute.isPrimaryKey ? "Primary key names cannot be edited" : "Click to edit attribute name"}
                        >
                          <div className="flex items-center">
                            {/* Attribute Name */}
                            <span className="mr-2">{attribute.name || 'Unnamed attribute'}</span>
                            
                            {/* Primary Key Tag */}
                            {attribute.isPrimaryKey && (
                              <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold mr-1">
                                PK
                              </Badge>
                            )}
                            {/* Foreign Key Tag */}
                            {attribute.isForeignKey && (
                              <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold mr-1">
                                FK
                              </Badge>
                            )}
                            {/* Mandatory Tag */}
                            {attribute.isRequired && !attribute.isPrimaryKey && (
                              <Badge className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold mr-1">
                                M
                              </Badge>
                            )}
                            {/* Unique Tag */}
                            {attribute.isUnique && !attribute.isPrimaryKey && (
                              <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold mr-1">
                                U
                              </Badge>
                            )}
                            {/* Rule Tag */}
                            {attribute.id && attributesWithRules[attribute.id] && (
                              <Badge className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold mr-1">
                                Rule
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Input
                          value={attribute.name}
                          onChange={(e) => handleAttributeChange(index, "name", e.target.value)}
                          className="h-8 py-1 input-white hidden absolute top-0 left-0 w-full z-10"
                          disabled={isViewer || attribute.isPrimaryKey}
                          onBlur={(e) => {
                            const input = e.currentTarget;
                            const textDisplay = input.previousElementSibling as HTMLDivElement;
                            if (textDisplay) {
                              // Save the attribute change to the database
                              handleAttributeChange(index, "name", input.value, true);
                              input.classList.add('hidden');
                              textDisplay.classList.remove('hidden');
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget;
                              const textDisplay = input.previousElementSibling as HTMLDivElement;
                              if (textDisplay) {
                                // Save the attribute change to the database
                                handleAttributeChange(index, "name", input.value, true);
                                input.classList.add('hidden');
                                textDisplay.classList.remove('hidden');
                              }
                            } else if (e.key === 'Escape') {
                              // Cancel editing without saving
                              const input = e.currentTarget;
                              const textDisplay = input.previousElementSibling as HTMLDivElement;
                              if (textDisplay) {
                                input.classList.add('hidden');
                                textDisplay.classList.remove('hidden');
                              }
                            }
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {attribute.isForeignKey ? (
                        <div className="text-gray-400 text-sm">Integer (fixed)</div>
                      ) : (
                        <div className="relative" ref={editingDataTypeIndex === index ? dataTypeDropdownRef : undefined}>
                          {editingDataTypeIndex === index ? (
                            <Select
                              value={attribute.dataType}
                              onValueChange={(value) => {
                                handleAttributeChange(index, "dataType", value, true);
                                setEditingDataTypeIndex(null);
                              }}
                            >
                              <SelectTrigger className="select-white">
                                <SelectValue placeholder="Select a data type" />
                              </SelectTrigger>
                              <SelectContent className="select-content-white">
                                {DATA_TYPE_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div 
                              className="py-1 px-2 rounded cursor-pointer hover:bg-gray-800 text-gray-100"
                              onClick={() => setEditingDataTypeIndex(index)}
                            >
                              {DATA_TYPE_OPTIONS.find(opt => opt.value === attribute.dataType)?.label || attribute.dataType}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Checkbox
                        checked={attribute.isRequired}
                        onCheckedChange={(checked) => handleAttributeChange(index, "isRequired", !!checked, true)}
                        disabled={attribute.isPrimaryKey || attribute.isForeignKey || isViewer} // Primary keys are always required, foreign keys should be disabled, and viewers can't modify
                        className="checkbox-white"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Checkbox
                        checked={attribute.isUnique}
                        onCheckedChange={(checked) => handleAttributeChange(index, "isUnique", !!checked, true)}
                        disabled={attribute.isPrimaryKey || attribute.isForeignKey || isViewer} // Primary keys are always unique, foreign keys should be disabled, and viewers can't modify
                        className="checkbox-white"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PermissionButton
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAttribute(index)}
                        disabled={attribute.isPrimaryKey} // Can't delete primary key
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        action="edit"
                        projectId={projectId}
                        disabledMessage="You don't have permission to delete attributes"
                      >
                        <TrashIcon size={16} />
                      </PermissionButton>
                    </td>
                  </tr>
                  {expandedRows[index] && (
                    <tr className="bg-gray-800">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="space-y-4">
                          {/* Description */}
                          <div className="space-y-2">
                            <Label htmlFor={`description-${index}`}>Description</Label>
                            <Textarea
                              id={`description-${index}`}
                              value={attribute.description || ''}
                              onChange={(e) => handleAttributeChange(index, "description", e.target.value)}
                              placeholder="Enter a description for this attribute"
                              className="textarea-white"
                              rows={2}
                              onBlur={() => handleAttributeChange(index, "description", attribute.description, true)}
                            />
                          </div>
                          
                          {/* Default Value */}
                          <div className="space-y-2">
                            <Label htmlFor={`default-value-${index}`}>Default Value</Label>
                            <Input
                              id={`default-value-${index}`}
                              value={attribute.defaultValue || ''}
                              onChange={(e) => handleAttributeChange(index, "defaultValue", e.target.value)}
                              placeholder="Default value"
                              className="input-white"
                              onBlur={() => handleAttributeChange(index, "defaultValue", attribute.defaultValue, true)}
                            />
                          </div>
                          
                          {/* Length/Precision/Scale */}
                          {(attribute.dataType === 'varchar' || attribute.dataType === 'char') && (
                            <div className="space-y-2">
                              <Label htmlFor={`length-${index}`}>Length</Label>
                              <Input
                                id={`length-${index}`}
                                type="number"
                                value={attribute.length || ''}
                                onChange={(e) => handleAttributeChange(index, "length", e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="Length"
                                className="input-white"
                                onBlur={() => handleAttributeChange(index, "length", attribute.length, true)}
                              />
                            </div>
                          )}
                          
                          {/* Format Validation */}
                          <div className="space-y-2">
                            <Label htmlFor={`format-validation-${index}`}>Format Validation</Label>
                            <Select
                              value={attribute.formatValidation || "none"}
                              onValueChange={(value) => handleAttributeChange(index, "formatValidation", value)}
                            >
                              <SelectTrigger id={`format-validation-${index}`} className="select-white">
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                              <SelectContent className="select-content-white">
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="url">URL</SelectItem>
                                <SelectItem value="phone">Phone Number</SelectItem>
                                <SelectItem value="zipcode">Zip Code</SelectItem>
                                <SelectItem value="custom">Custom Regex</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Additional options */}
                          <div className="space-y-4 bg-gray-700 p-4 rounded-md">
                            <div className="flex flex-wrap gap-6">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`searchable-${index}`}
                                  checked={attribute.searchable || false}
                                  onCheckedChange={(checked) => handleAttributeChange(index, "searchable", !!checked)}
                                  disabled={isViewer} // Viewers can't modify
                                  className="checkbox-white"
                                />
                                <Label htmlFor={`searchable-${index}`} className="text-sm font-normal">Searchable</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`case-sensitive-${index}`}
                                  checked={attribute.caseSensitive || false}
                                  onCheckedChange={(checked) => handleAttributeChange(index, "caseSensitive", !!checked)}
                                  disabled={isViewer} // Viewers can't modify
                                  className="checkbox-white"
                                />
                                <Label htmlFor={`case-sensitive-${index}`} className="text-sm font-normal">Case Sensitive</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`indexable-${index}`}
                                  checked={attribute.indexable || false}
                                  onCheckedChange={(checked) => handleAttributeChange(index, "indexable", !!checked)}
                                  disabled={isViewer} // Viewers can't modify
                                  className="checkbox-white"
                                />
                                <Label htmlFor={`indexable-${index}`} className="text-sm font-normal">Indexable</Label>
                              </div>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-8 text-xs"
                              onClick={() => toggleRowExpanded(index)}
                            >
                              Hide Advanced
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
