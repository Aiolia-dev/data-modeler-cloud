"use client";

import React, { useState, useEffect } from "react";
import { Rule } from "@/types/rule";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2Icon, Trash2Icon, TagIcon } from "lucide-react";
import { createAdminClient } from "@/utils/supabase/admin";

interface RuleListProps {
  rules: Rule[];
  onEdit: (rule: Rule) => void;
  onDelete: (ruleId: string) => void;
  onToggleEnabled: (ruleId: string, isEnabled: boolean) => void;
}

export default function RuleList({ rules, onEdit, onDelete, onToggleEnabled }: RuleListProps) {
  // State to store attribute names
  const [attributeNames, setAttributeNames] = useState<Record<string, string>>({});
  
  // Fetch attribute names for all rules with attribute_id
  useEffect(() => {
    const fetchAttributeNames = async () => {
      const attributeIds = rules
        .filter(rule => rule.attribute_id)
        .map(rule => rule.attribute_id);
      
      if (attributeIds.length === 0) return;
      
      try {
        // Create a unique set of attribute IDs to fetch
        const uniqueAttributeIds = Array.from(new Set(attributeIds.filter(id => id !== null)));
        
        // Fetch attribute details for each ID
        const promises = uniqueAttributeIds.map(async (attributeId) => {
          if (!attributeId) return null;
          
          const response = await fetch(`/api/attributes/${attributeId}`);
          if (!response.ok) return null;
          
          const data = await response.json();
          return { id: attributeId, name: data.name };
        });
        
        const results = await Promise.all(promises);
        
        // Create a map of attribute ID to name
        const nameMap: Record<string, string> = {};
        results.forEach(result => {
          if (result) {
            nameMap[result.id] = result.name;
          }
        });
        
        setAttributeNames(nameMap);
      } catch (error) {
        console.error("Error fetching attribute names:", error);
      }
    };
    
    fetchAttributeNames();
  }, [rules]);
  // Handle rule deletion
  const handleDelete = async (ruleId: string) => {
    if (confirm("Are you sure you want to delete this rule? This action cannot be undone.")) {
      try {
        const response = await fetch(`/api/rules/${ruleId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`Failed to delete rule: ${response.statusText}`);
        }

        onDelete(ruleId);
      } catch (error) {
        console.error("Error deleting rule:", error);
        alert("Failed to delete rule. Please try again.");
      }
    }
  };

  // Handle toggling rule enabled/disabled status
  const handleToggleEnabled = async (ruleId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_enabled: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update rule: ${response.statusText}`);
      }

      onToggleEnabled(ruleId, !currentStatus);
    } catch (error) {
      console.error("Error updating rule:", error);
      alert("Failed to update rule. Please try again.");
    }
  };

  // Helper function to get badge color based on rule type
  const getRuleTypeBadgeClass = (ruleType: string) => {
    switch (ruleType) {
      case "validation":
        return "bg-purple-500 hover:bg-purple-600";
      case "business":
        return "bg-blue-500 hover:bg-blue-600";
      case "automation":
        return "bg-green-500 hover:bg-green-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  // Helper function to get entity or attribute name badge
  const getEntityBadgeClass = (rule: Rule) => {
    return "bg-gray-700 hover:bg-gray-800";
  };

  // Format condition expression for display
  const formatExpression = (expression: string) => {
    return expression;
  };

  return (
    <div className="space-y-4">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700"
        >
          {/* Rule header with status indicator */}
          <div className="flex items-center p-4 border-b border-gray-700">
            <div 
              className={`w-3 h-3 rounded-full mr-3 ${
                rule.is_enabled ? "bg-green-500" : "bg-gray-500"
              }`}
            ></div>
            <div className="flex-grow">
              <h3 className="text-lg font-medium">{rule.name}</h3>
              {rule.attribute_id && attributeNames[rule.attribute_id] && (
                <div className="flex items-center mt-1 text-sm text-gray-400">
                  <TagIcon className="h-3 w-3 mr-1" />
                  <span>Attribute: {attributeNames[rule.attribute_id]}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getRuleTypeBadgeClass(rule.rule_type)}>
                {rule.rule_type.charAt(0).toUpperCase() + rule.rule_type.slice(1)}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(rule)}
                className="h-8 w-8"
              >
                <Edit2Icon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(rule.id)}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2Icon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Rule description */}
          {rule.description && (
            <div className="px-4 py-2 text-gray-400 text-sm">
              {rule.description}
            </div>
          )}

          {/* Rule condition and action */}
          <div className="p-4 bg-gray-900">
            <div className="font-mono text-sm">
              <div className="text-blue-400 mb-1">IF {formatExpression(rule.condition_expression)}</div>
              <div className="text-blue-400">THEN {formatExpression(rule.action_expression)}</div>
            </div>
          </div>

          {/* Rule footer with controls */}
          <div className="p-4 flex justify-between items-center bg-gray-800 border-t border-gray-700">
            <div>
              {rule.severity && (
                <Badge
                  className={
                    rule.severity === "error"
                      ? "bg-red-500 hover:bg-red-600"
                      : rule.severity === "warning"
                      ? "bg-yellow-500 hover:bg-yellow-600"
                      : "bg-blue-500 hover:bg-blue-600"
                  }
                >
                  {rule.severity.charAt(0).toUpperCase() + rule.severity.slice(1)}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleEnabled(rule.id, rule.is_enabled)}
            >
              {rule.is_enabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
