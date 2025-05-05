"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, LinkIcon, ChevronRight } from "lucide-react";
import { Rule } from "@/types/rule";

interface RulesListViewProps {
  dataModelId: string;
  projectId: string;
}

export function RulesListView({ dataModelId, projectId }: RulesListViewProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);

  // Fetch all rules for the data model
  useEffect(() => {
    async function fetchRules() {
      try {
        setLoading(true);
        
        // Fetch entities first to get their IDs
        const entitiesResponse = await fetch(`/api/projects/${projectId}/models/${dataModelId}/entities`);
        if (!entitiesResponse.ok) {
          throw new Error("Failed to fetch entities");
        }
        
        const entitiesData = await entitiesResponse.json();
        const entities = entitiesData.entities || [];
        
        // If no entities, return empty rules
        if (entities.length === 0) {
          setRules([]);
          return;
        }
        
        // Fetch rules for each entity
        const allRules: Rule[] = [];
        
        // Create a map to store attribute names by ID
        const attributeNamesMap: Record<string, string> = {};
        
        for (const entity of entities) {
          // Fetch attributes for this entity
          const attributesResponse = await fetch(`/api/attributes?entityId=${entity.id}`);
          if (attributesResponse.ok) {
            const responseData = await attributesResponse.json();
            // Extract the attributes array from the response
            const attributesArray = responseData.attributes || [];
            
            // Create a map of attribute IDs to names
            attributesArray.forEach((attr: any) => {
              if (attr.id) {
                attributeNamesMap[attr.id] = attr.name;
              }
            });
          }
          
          // Fetch rules for this entity
          const rulesResponse = await fetch(`/api/rules?entityId=${entity.id}`);
          if (rulesResponse.ok) {
            const rulesData = await rulesResponse.json();
            // Add entity name and attribute name to each rule for display
            const rulesWithEntity = rulesData.map((rule: Rule) => {
              const attributeName = rule.attribute_id ? attributeNamesMap[rule.attribute_id] || 'Unknown' : null;
              return {
                ...rule,
                entityName: entity.name,
                attributeName: attributeName
              };
            });
            allRules.push(...rulesWithEntity);
          }
        }
        
        // Process dependencies
        const processedRules = processDependencies(allRules);
        setRules(processedRules);
      } catch (error) {
        console.error("Error fetching rules:", error);
        setError("Failed to load rules");
      } finally {
        setLoading(false);
      }
    }
    
    fetchRules();
  }, [dataModelId, projectId]);

  // Process dependencies for all rules
  const processDependencies = (rulesList: Rule[]) => {
    const ruleMap: Record<string, Rule> = {};
    
    // First, create a map of all rules by ID
    rulesList.forEach(rule => {
      ruleMap[rule.id] = rule;
    });
    
    // Then, process dependencies for each rule
    return rulesList.map(rule => {
      const processedRule = { ...rule };
      
      // Process depends_on
      if (rule.dependencies && rule.dependencies.length > 0) {
        processedRule.depends_on = rule.dependencies.map(depId => {
          const dependentRule = ruleMap[depId];
          return dependentRule ? dependentRule.name : 'Unknown Rule';
        });
      } else {
        processedRule.depends_on = [];
      }
      
      // Process required_by (reverse dependencies)
      processedRule.required_by = [];
      
      // Find all rules that depend on this rule
      rulesList.forEach(otherRule => {
        if (otherRule.dependencies && otherRule.dependencies.includes(rule.id)) {
          processedRule.required_by!.push(otherRule.name);
        }
      });
      
      return processedRule;
    });
  };
  
  // Filter rules based on search query
  const filteredRules = rules.filter(rule => 
    rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (rule.entityName ? rule.entityName.toLowerCase().includes(searchQuery.toLowerCase()) : false)
  );

  // Get rule type badge
  const getRuleTypeBadge = (ruleType: string) => {
    switch (ruleType) {
      case "validation":
        return <Badge className="bg-purple-600 hover:bg-purple-700">Validation</Badge>;
      case "business":
        return <Badge className="bg-blue-600 hover:bg-blue-700">Business</Badge>;
      case "automation":
        return <Badge className="bg-orange-600 hover:bg-orange-700">Automation</Badge>;
      default:
        return <Badge>{ruleType}</Badge>;
    }
  };

  // Get status indicator
  const getStatusIndicator = (isEnabled: boolean) => {
    return (
      <span className="flex items-center">
        <span 
          className={`w-2 h-2 rounded-full mr-2 ${isEnabled ? 'bg-green-500' : 'bg-gray-400'}`}
        ></span>
        {isEnabled ? 'Enabled' : 'Disabled'}
      </span>
    );
  };

  // Handle rule selection
  const handleRuleSelect = (rule: Rule) => {
    setSelectedRule(rule === selectedRule ? null : rule);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-3">Loading rules...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/15 text-destructive p-6 rounded-md">
        <h3 className="text-lg font-medium mb-2">Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Rule Dependencies</h2>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rules..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-primary/10">Graph View</Button>
            <Button variant="outline" className="bg-primary text-primary-foreground">List View</Button>
          </div>
        </div>
      </div>

      <div className="border border-gray-700 rounded-md overflow-hidden bg-gray-900">
        {/* Table header */}
        <table className="w-full">
          <thead>
            <tr className="bg-gray-800 border-b border-gray-700">
              <th className="text-left px-4 py-3 font-medium text-gray-200">Rule Name</th>
              <th className="text-center px-4 py-3 font-medium text-gray-200">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-200">Entity</th>
              <th className="text-left px-4 py-3 font-medium text-gray-200">Attribute</th>
              <th className="text-center px-4 py-3 font-medium text-gray-200">Depends On</th>
              <th className="text-center px-4 py-3 font-medium text-gray-200">Required By</th>
            </tr>
          </thead>
          <tbody>
          {filteredRules.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No rules found. Create rules for your entities to see them here.
              </td>
            </tr>
          ) : (
            filteredRules.map((rule) => (
              <React.Fragment key={rule.id}>
                {/* Rule row */}
                <tr
                  className={`border-t border-gray-700 hover:bg-gray-800/30 cursor-pointer ${
                    selectedRule?.id === rule.id ? 'bg-gray-800/50' : ''
                  }`}
                  onClick={() => handleRuleSelect(rule)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-100">{rule.name}</div>
                      {getStatusIndicator(rule.is_enabled)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{getRuleTypeBadge(rule.rule_type)}</td>
                  <td className="px-4 py-3">{rule.entityName || 'Unknown Entity'}</td>
                  <td className="px-4 py-3">
                    {rule.attributeName ? (
                      <span>{rule.attributeName}</span>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {rule.depends_on && rule.depends_on.length > 0 ? (
                      <div className="flex items-center justify-center">
                        <LinkIcon size={14} className="mr-1 text-gray-400" />
                        <span className="text-gray-300">{rule.depends_on.length} rules</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {rule.required_by && rule.required_by.length > 0 ? (
                      <div className="flex items-center justify-center">
                        <ChevronRight size={14} className="mr-1 text-gray-400" />
                        <span className="text-gray-300">{rule.required_by.length} rules</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                </tr>

                {/* Rule details section (expanded when selected) */}
                {selectedRule?.id === rule.id && (
                  <tr className="border-t border-gray-700">
                    <td colSpan={6} className="bg-gray-800/30 px-6 py-4">
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <h3 className="text-lg font-medium text-gray-100 mb-2">{rule.name}</h3>
                          <p className="text-gray-400 mb-4">{rule.description || "No description provided."}</p>
                          
                          <div className="bg-gray-900 p-4 rounded-md font-mono text-sm">
                            {rule.rule_type === "validation" && (
                              <>
                                <div className="text-blue-400 mb-1">IF {rule.condition_expression}</div>
                                <div className="text-green-400">THEN {rule.action_expression}</div>
                              </>
                            )}
                            {rule.rule_type !== "validation" && (
                              <div className="text-green-400">{rule.action_expression}</div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-100 mb-2">Dependencies</h4>
                          <div className="space-y-2">
                            <div>
                              <div className="text-sm text-gray-400">Depends on:</div>
                              {rule.depends_on && rule.depends_on.length > 0 ? (
                                <ul className="list-disc list-inside pl-2 text-gray-300">
                                  {rule.depends_on.map((dep: string, index: number) => (
                                    <li key={index}>{dep}</li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-sm text-gray-400">No dependencies</div>
                              )}
                            </div>
                            
                            <div>
                              <div className="text-sm text-gray-400">Required by:</div>
                              {rule.required_by && rule.required_by.length > 0 ? (
                                <ul className="list-disc list-inside pl-2 text-gray-300">
                                  {rule.required_by.map((req: string, index: number) => (
                                    <li key={index}>{req}</li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-sm text-gray-400">Not required by any rule</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
