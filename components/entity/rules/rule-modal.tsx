"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Rule, RuleFormData } from "@/types/rule";

interface RuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  dataModelId: string;
  entityName: string; // Add entityName prop
  onRuleCreated?: (rule: Rule) => void;
  onRuleUpdated?: (rule: Rule) => void;
  rule?: Rule | null;
}

export default function RuleModal({
  open,
  onOpenChange,
  entityId,
  dataModelId: propDataModelId,
  entityName,
  onRuleCreated,
  onRuleUpdated,
  rule,
}: RuleModalProps) {
  const isEditing = !!rule;

  // Initialize form data
  const [formData, setFormData] = useState<RuleFormData>({
    name: "",
    description: "",
    rule_type: "validation",
    entity_id: entityId,
    attribute_id: undefined,
    condition_expression: "",
    action_expression: "",
    is_enabled: true,
    has_dependencies: false,
    dependencies: [],
  });

  // State for available rules to select as dependencies
  const [availableRules, setAvailableRules] = useState<Rule[]>([]);
  const [currentDataModelId, setCurrentDataModelId] = useState<string | null>(propDataModelId);
  
  // State for entity attributes
  const [attributes, setAttributes] = useState<any[]>([]);
  const [attributesLoading, setAttributesLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal is opened/closed
  useEffect(() => {
    if (open) {
      if (rule) {
        // Editing mode - populate form with rule data
        setFormData({
          name: rule.name,
          description: rule.description || "",
          rule_type: rule.rule_type as "validation" | "business" | "automation",
          entity_id: rule.entity_id,
          attribute_id: rule.attribute_id,
          condition_expression: rule?.condition_expression || "",
          action_expression: rule?.action_expression || "",
          is_enabled: rule?.is_enabled !== undefined ? rule.is_enabled : true,
          has_dependencies: rule?.dependencies && rule.dependencies.length > 0,
          dependencies: rule?.dependencies || [],
        });
      } else {
        // Creation mode - reset form
        setFormData({
          name: "",
          description: "",
          rule_type: "validation",
          entity_id: entityId,
          attribute_id: undefined,
          condition_expression: "",
          action_expression: "",
          is_enabled: true,
          has_dependencies: false,
          dependencies: [],
        });
      }

      // Fetch available rules for dependencies
      fetchAvailableRules();
      
      // Fetch attributes for the entity
      fetchEntityAttributes();
    }
  }, [open, rule, entityId]);
  
  // Fetch attributes for the entity
  const fetchEntityAttributes = async () => {
    if (!entityId) return;
    
    try {
      setAttributesLoading(true);
      const response = await fetch(`/api/attributes?entityId=${entityId}`);
      
      if (response.ok) {
        const data = await response.json();
        // Filter out primary keys and foreign keys
        const filteredAttributes = data.attributes.filter((attr: any) => 
          !attr.is_primary_key && !attr.is_foreign_key
        );
        setAttributes(filteredAttributes);
      } else {
        console.error('Failed to fetch attributes');
      }
    } catch (error) {
      console.error('Error fetching attributes:', error);
    } finally {
      setAttributesLoading(false);
    }
  };

  // Fetch available rules that can be selected as dependencies
  const fetchAvailableRules = async () => {
    try {
      if (!entityId) {
        console.error("EntityId is undefined in fetchAvailableRules");
        setAvailableRules([]);
        return;
      }
      
      console.log('Fetching available rules for dependencies...');
      
      // APPROACH 1: First try to get rules directly for the current entity
      // This is the most reliable approach and should work even if data_model_id isn't set correctly
      console.log(`Fetching rules directly for entity: ${entityId}`);
      const directEntityRulesResponse = await fetch(`/api/rules?entityId=${entityId}`);
      
      if (directEntityRulesResponse.ok) {
        const directRulesData = await directEntityRulesResponse.json();
        console.log(`Found ${Array.isArray(directRulesData) ? directRulesData.length : 0} rules directly for entity ${entityId}`);
        
        if (Array.isArray(directRulesData) && directRulesData.length > 0) {
          // We found rules for this entity, use them
          const rulesWithEntity = directRulesData.map((rule: Rule) => ({
            ...rule,
            entityName: entityName || 'Current Entity'
          }));
          
          // Filter out the current rule if editing
          const filteredRules = rule ? rulesWithEntity.filter(r => r.id !== rule.id) : rulesWithEntity;
          console.log(`Available rules for dependencies (direct entity approach): ${filteredRules.length}`);
          
          setAvailableRules(filteredRules);
          return;
        }
      }
      
      // APPROACH 2: If no rules found directly, try using the data model ID
      // Get the data model ID from the entity ID
      const entityResponse = await fetch(`/api/entities/${entityId}`);
      if (!entityResponse.ok) {
        console.error("Failed to fetch entity details");
        return;
      }
      
      const entityData = await entityResponse.json();
      const fetchedDataModelId = entityData.entity?.data_model_id;
      
      if (!fetchedDataModelId) {
        console.error("Data model ID not found");
        return;
      }
      
      // Store the data model ID in state for debugging and display
      setCurrentDataModelId(fetchedDataModelId);
      
      console.log(`Found data model ID: ${fetchedDataModelId}`);
      
      // DIRECT APPROACH: Fetch rules directly using the data_model_id
      console.log(`Fetching rules for data model ${fetchedDataModelId}`);
      
      // Use the new endpoint that uses data_model_id directly
      console.log(`Fetching rules with URL: /api/rules?dataModelId=${fetchedDataModelId}`);
      const rulesResponse = await fetch(`/api/rules?dataModelId=${fetchedDataModelId}`);
      
      // Log the response status
      console.log(`Rules fetch response status: ${rulesResponse.status}`);
      
      if (!rulesResponse.ok) {
        console.error(`Failed to fetch rules by data model ID: ${rulesResponse.statusText}`);
        // Try to get more error details
        try {
          const errorData = await rulesResponse.text();
          console.error("Error response:", errorData);
        } catch (e) {
          console.error("Could not parse error response");
        }
        return;
      }
      
      // Get the response as text first for debugging
      const responseText = await rulesResponse.text();
      console.log(`Raw response: ${responseText}`);
      
      // Parse the JSON
      let rulesData;
      try {
        rulesData = JSON.parse(responseText);
        console.log("Parsed rules data:", rulesData);
      } catch (e) {
        console.error("Error parsing JSON response:", e);
        setAvailableRules([]);
        return;
      }
      
      if (!Array.isArray(rulesData) || rulesData.length === 0) {
        console.log("No rules found for this data model");
        setAvailableRules([]);
        return;
      }
      
      console.log(`Found ${rulesData.length} rules for data model ${fetchedDataModelId}`);
      
      // Add entity names to the rules
      const rulesWithEntityNames = await Promise.all(
        rulesData.map(async (rule: Rule) => {
          if (rule.entity_id) {
            try {
              const entityResponse = await fetch(`/api/entities/${rule.entity_id}`);
              if (entityResponse.ok) {
                const entityData = await entityResponse.json();
                return {
                  ...rule,
                  entityName: entityData.entity?.name || 'Unknown Entity'
                };
              }
            } catch (error) {
              console.error(`Error fetching entity name for rule ${rule.id}:`, error);
            }
          }
          return {
            ...rule,
            entityName: 'Unknown Entity'
          };
        })
      );
      
      console.log(`Total rules found for data model: ${rulesWithEntityNames.length}`);
      
      // Filter out the current rule if editing
      const filteredRules = rule ? rulesWithEntityNames.filter(r => r.id !== rule.id) : rulesWithEntityNames;
      console.log(`Available rules for dependencies (after filtering): ${filteredRules.length}`);
      
      setAvailableRules(filteredRules);
    } catch (error) {
      console.error("Error fetching available rules:", error);
    }
  };

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle checkbox changes
  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      has_dependencies: checked,
      // Reset dependencies if unchecked
      dependencies: checked ? prev.dependencies : []
    }));
  };

  // Handle dependency selection
  const handleDependencyChange = (selectedIds: string[]) => {
    setFormData(prev => ({ ...prev, dependencies: selectedIds }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate the form data before submitting
      if (!formData.name.trim()) {
        throw new Error("Rule name is required");
      }

      // Only validate condition_expression for validation rules
      if (formData.rule_type === 'validation' && !formData.condition_expression.trim()) {
        throw new Error("Condition expression is required for validation rules");
      }

      // For non-validation rules, ensure we don't send an empty condition_expression
      // which might cause issues with some backend validations
      const submissionData = {
        ...formData,
        // For business and automation rules, use a default value if empty
        condition_expression: formData.rule_type !== 'validation' && !formData.condition_expression.trim()
          ? 'true'
          : formData.condition_expression
      };

      if (!formData.action_expression.trim()) {
        throw new Error("Action expression is required");
      }

      console.log('Submitting rule form data:', formData);

      const url = isEditing ? `/api/rules/${rule?.id}` : "/api/rules";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...submissionData,
          // Both entity_id and attribute_id are required
          entity_id: entityId,
          attribute_id: formData.attribute_id
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('API error response:', responseData);
        throw new Error(responseData.error || responseData.details || "Failed to save rule");
      }

      console.log('Rule saved successfully:', responseData);

      if (isEditing && onRuleUpdated) {
        onRuleUpdated(responseData);
      } else if (!isEditing && onRuleCreated) {
        onRuleCreated(responseData);
      }

      onOpenChange(false);
    } catch (err) {
      console.error("Error saving rule:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 text-white">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Rule" : "Add New Rule"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rule Type */}
          <div className="space-y-2">
            <Label>Rule Type</Label>
            <RadioGroup
              value={formData.rule_type}
              onValueChange={(value) =>
                handleSelectChange("rule_type", value as any)
              }
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="validation" id="validation" />
                <Label htmlFor="validation" className="cursor-pointer">
                  Validation Rule
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="business" id="business" />
                <Label htmlFor="business" className="cursor-pointer">
                  Business Rule
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="automation" id="automation" />
                <Label htmlFor="automation" className="cursor-pointer">
                  Automation
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Rule Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter a descriptive name"
              value={formData.name}
              onChange={handleChange}
              required
              className="bg-gray-800 border-gray-700"
            />
          </div>

          {/* Related Entity */}
          <div className="space-y-2">
            <Label>Related Entity</Label>
            <Input
              value={entityName}
              disabled
              className="bg-gray-800 border-gray-700 opacity-70"
            />
          </div>

          {/* Attribute Dropdown - required field */}
          <div className="space-y-2">
            <Label htmlFor="attribute_id" className="flex items-center">
              Attribute <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select
              name="attribute_id"
              value={formData.attribute_id || ''}
              onValueChange={(value) => handleSelectChange('attribute_id', value)}
              required
            >
              <SelectTrigger className="bg-gray-800 border-gray-700">
                <SelectValue placeholder="Select an attribute" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 max-h-[300px]">
                {attributesLoading ? (
                  <div className="p-2 text-sm text-gray-400">Loading attributes...</div>
                ) : attributes.length === 0 ? (
                  <div className="p-2 text-sm text-gray-400">No attributes available</div>
                ) : (
                  attributes.map(attr => (
                    <SelectItem key={attr.id} value={attr.id}>
                      {attr.name} ({attr.data_type})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400 mt-1">
              Select the attribute this rule applies to
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe what this rule does"
              value={formData.description}
              onChange={handleChange}
              className="bg-gray-800 border-gray-700 min-h-[80px]"
            />
          </div>

          {/* Condition (IF) - Only show for validation rules */}
          {formData.rule_type === 'validation' && (
            <div className="space-y-2">
              <Label htmlFor="condition_expression">
                Condition (IF) <span className="text-gray-400 text-xs">Use field names, operators and values</span>
              </Label>
              <Textarea
                id="condition_expression"
                name="condition_expression"
                placeholder="e.g., order.total_amount > 100"
                value={formData.condition_expression}
                onChange={handleChange}
                required={formData.rule_type === 'validation'}
                className="bg-gray-800 border-gray-700 font-mono"
              />
            </div>
          )}

          {/* Has Dependencies Checkbox */}
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox
              id="has-dependencies"
              checked={formData.has_dependencies}
              onCheckedChange={handleCheckboxChange}
            />
            <Label htmlFor="has-dependencies" className="cursor-pointer">This rule has dependencies</Label>
          </div>

          {/* Dependencies Dropdown - only show if has_dependencies is checked */}
          {formData.has_dependencies && (
            <div className="space-y-2 mt-2">
              <Label htmlFor="dependencies">Select Dependencies</Label>
              <Select
                name="dependencies"
                value={formData.dependencies?.length ? formData.dependencies[0] : ""}
                onValueChange={(value) => handleDependencyChange([value])}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Select a rule" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 max-h-[300px]">
                  {availableRules.length === 0 ? (
                    <div className="p-2 text-sm text-gray-400">No rules available</div>
                  ) : (
                    availableRules.map(rule => (
                      <SelectItem key={rule.id} value={rule.id}>
                        {rule.name} ({rule.entityName || 'Unknown Entity'}) - {rule.rule_type}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <div className="text-xs text-gray-400 mt-1">
                {availableRules.length === 0 && (
                  <p>There are no other rules available in this data model. Create more rules first to establish dependencies.</p>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                <p>Debug info: Found {availableRules.length} available rules for data model</p>
                <p>Entity ID: {entityId || 'undefined'}</p>
                <p>Data Model ID: {currentDataModelId || 'undefined'}</p>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Select a rule that this rule depends on. The selected rule must be executed before this rule.
              </p>
            </div>
          )}

          {/* Error Message / Action */}
          <div className="space-y-2">
            <Label htmlFor="action_expression">
              {formData.rule_type === "automation" ? "Action" : "Error Message"}
            </Label>
            <Textarea
              id="action_expression"
              name="action_expression"
              placeholder={
                formData.rule_type === "automation"
                  ? "e.g., triggerAlert('Low inventory for ' + product.name)"
                  : "Message to display when validation fails"
              }
              value={formData.action_expression}
              onChange={handleChange}
              required
              className="bg-gray-800 border-gray-700 font-mono"
            />
          </div>

          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEditing
                ? "Save Rule"
                : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
