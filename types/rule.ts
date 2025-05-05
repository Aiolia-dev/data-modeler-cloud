export interface Rule {
  id: string;
  name: string;
  description: string | null;
  rule_type: string;
  entity_id: string;
  attribute_id: string | null;
  condition_expression: string;
  action_expression: string;
  severity: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  dependencies?: string[]; // IDs of rules this rule depends on
  // Additional properties for the rules list view
  entityName?: string; // Name of the entity this rule belongs to
  attributeName?: string | null; // Name of the attribute this rule applies to
  depends_on?: string[]; // List of rule names this rule depends on
  required_by?: string[]; // List of rule names that require this rule
}

export interface RuleFormData {
  name: string;
  description: string;
  rule_type: 'validation' | 'business' | 'automation';
  entity_id: string;
  attribute_id?: string | null;
  condition_expression: string;
  action_expression: string;
  severity?: 'error' | 'warning' | 'info' | null;
  is_enabled: boolean;
  has_dependencies?: boolean;
  dependencies?: string[];
}

export interface RuleFilterOptions {
  entityId?: string;
  attributeId?: string;
  ruleType?: 'validation' | 'business' | 'automation' | 'all';
}
