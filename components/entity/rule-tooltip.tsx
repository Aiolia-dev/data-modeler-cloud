"use client";

import React, { useState, useEffect } from 'react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Rule {
  id: string;
  name: string;
  rule_type: string;
  condition_expression: string;
  entity_id: string;
}

interface RuleTooltipProps {
  entityId: string;
  projectId: string;
  dataModelId: string;
  children: React.ReactNode;
}

export default function RuleTooltip({ entityId, projectId, dataModelId, children }: RuleTooltipProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch rules for this entity when the tooltip is opened
  const fetchRules = async () => {
    if (!entityId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/rules?entityId=${entityId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch rules: ${response.status}`);
      }
      
      const data = await response.json();
      // The API returns the rules array directly, not wrapped in a 'rules' property
      setRules(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching rules:", err);
      setError(err.message || "Failed to load rules");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild onMouseEnter={fetchRules}>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className="bg-gray-800 border border-gray-700 p-3 max-w-md"
        >
          {loading ? (
            <div className="py-2 text-sm">Loading rules...</div>
          ) : error ? (
            <div className="py-2 text-sm text-red-400">Error loading rules</div>
          ) : rules.length === 0 ? (
            <div className="py-2 text-sm">No rules defined for this entity</div>
          ) : (
            <div className="space-y-2">
              <h3 className="font-medium text-white mb-2">Rules for this entity</h3>
              {rules.map((rule) => (
                <div key={rule.id} className="border-t border-gray-700 pt-2 first:border-t-0 first:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{rule.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      rule.rule_type === 'validation' ? 'bg-blue-900/50 text-blue-300' : 
                      rule.rule_type === 'business' ? 'bg-green-900/50 text-green-300' : 
                      'bg-purple-900/50 text-purple-300'
                    }`}>
                      {rule.rule_type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-300 mt-1">
                    <span className="font-mono bg-gray-900 px-1 py-0.5 rounded">
                      {rule.condition_expression}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
