"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusIcon } from "lucide-react";
import { Rule } from "@/types/rule";
// Import the components from the same directory
import RuleList from "@/components/entity/rules/rule-list";
import RuleModal from "@/components/entity/rules/rule-modal";

interface RulesTabProps {
  entityId: string;
  dataModelId: string;
  projectId: string;
}

export default function RulesTab({ entityId, dataModelId, projectId }: RulesTabProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ruleFilter, setRuleFilter] = useState<'all' | 'validation' | 'business' | 'automation'>('all');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [entityName, setEntityName] = useState<string>("");

  // Fetch rules for this entity
  const fetchRules = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/rules?entityId=${entityId}`);
      if (!response.ok) {
        throw new Error(`Error fetching rules: ${response.statusText}`);
      }
      const data = await response.json();
      setRules(data);
    } catch (err) {
      console.error("Failed to fetch rules:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch rules");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch entity name
  const fetchEntityName = async () => {
    try {
      const response = await fetch(`/api/entities/${entityId}?dataModelId=${dataModelId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch entity: ${response.statusText}`);
      }
      
      const data = await response.json();
      setEntityName(data.entity?.name || "Entity");
    } catch (err) {
      console.error('Error fetching entity name:', err);
      setEntityName('Entity');
    }
  };

  // Load rules and entity name on component mount
  useEffect(() => {
    fetchRules();
    fetchEntityName();
  }, [entityId, dataModelId]);

  // Handle rule creation
  const handleRuleCreated = (newRule: Rule) => {
    setRules((prevRules) => [newRule, ...prevRules]);
    setShowRuleModal(false);
  };

  // Handle rule update
  const handleRuleUpdated = (updatedRule: Rule) => {
    setRules((prevRules) =>
      prevRules.map((rule) => (rule.id === updatedRule.id ? updatedRule : rule))
    );
    setEditingRule(null);
    setShowRuleModal(false);
  };

  // Handle rule deletion
  const handleRuleDeleted = (ruleId: string) => {
    setRules((prevRules) => prevRules.filter((rule) => rule.id !== ruleId));
  };

  // Filter rules based on selected tab
  const filteredRules = rules.filter((rule) => {
    if (ruleFilter === 'all') return true;
    return rule.rule_type === ruleFilter;
  });

  // Handle edit rule
  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    setShowRuleModal(true);
  };

  // Handle toggle enabled
  const handleToggleEnabled = (ruleId: string, isEnabled: boolean) => {
    // Update the rule's enabled status in the UI immediately
    setRules(prevRules => 
      prevRules.map(rule => 
        rule.id === ruleId ? { ...rule, is_enabled: isEnabled } : rule
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Constraints and Business Rules</h2>
        <Button onClick={() => setShowRuleModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      <Tabs defaultValue="all" onValueChange={(value) => setRuleFilter(value as any)}>
        <TabsList>
          <TabsTrigger value="all">All Rules</TabsTrigger>
          <TabsTrigger value="validation">Validation Rules</TabsTrigger>
          <TabsTrigger value="business">Business Rules</TabsTrigger>
          <TabsTrigger value="automation">Automations</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md">
          {error}
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            No {ruleFilter !== 'all' ? ruleFilter : ''} rules found for this entity.
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setShowRuleModal(true)}
          >
            Create your first rule
          </Button>
        </div>
      ) : (
        <RuleList 
          rules={filteredRules} 
          onEdit={handleEditRule} 
          onDelete={handleRuleDeleted}
          onToggleEnabled={handleToggleEnabled}
        />
      )}

      {/* Rule Creation/Editing Modal */}
      <RuleModal
        open={showRuleModal}
        onOpenChange={setShowRuleModal}
        entityId={entityId}
        dataModelId={dataModelId}
        entityName={entityName}
        onRuleCreated={handleRuleCreated}
        onRuleUpdated={handleRuleUpdated}
        rule={editingRule}
      />
    </div>
  );
}
