import { createClient } from '@/utils/supabase/client';

// Types for the different data model elements
type Entity = {
  id: string;
  name: string;
  description?: string;
  data_model_id: string;
  entity_type?: 'standard' | 'join';
  position_x?: number;
  position_y?: number;
  referential_id?: string;
};

type Attribute = {
  id?: string;
  name: string;
  description?: string;
  data_type: string;
  entity_id: string;
  is_required: boolean;
  is_unique: boolean;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  referenced_entity_id?: string;
  default_value?: string;
  length?: number;
};

type Referential = {
  id?: string;
  name: string;
  description?: string;
  color: string;
  data_model_id: string;
};

type Relationship = {
  id?: string;
  name: string;
  source_entity_id: string;
  target_entity_id: string;
  source_cardinality?: string;
  target_cardinality?: string;
  relationship_type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  data_model_id: string;
};

type Rule = {
  id?: string;
  name: string;
  description?: string;
  rule_type: 'validation' | 'business' | 'automation';
  entity_id?: string;
  attribute_id?: string;
  condition_expression: string;
  action_expression?: string;
  is_enabled: boolean;
  severity?: 'error' | 'warning' | 'info';
  data_model_id: string;
};

// Types for the changes that can be made to the data model
type ModelChanges = {
  entities?: {
    create?: Entity[];
    update?: { id: string; changes: Partial<Entity> }[];
    delete?: string[];
  };
  attributes?: {
    create?: Attribute[];
    update?: { id: string; changes: Partial<Attribute> }[];
    delete?: string[];
  };
  referentials?: {
    create?: Referential[];
    update?: { id: string; changes: Partial<Referential> }[];
    delete?: string[];
  };
  relationships?: {
    create?: Relationship[];
    update?: { id: string; changes: Partial<Relationship> }[];
    delete?: string[];
  };
  rules?: {
    create?: Rule[];
    update?: { id: string; changes: Partial<Rule> }[];
    delete?: string[];
  };
};

// Types for the response from the NL processor
type NLProcessorResponse = {
  message: string;
  changes?: ModelChanges;
  requiresMoreInfo?: boolean;
  requiredInfo?: {
    type: string;
    options?: string[];
    currentValue?: string;
  };
};

// Types for the conversation history
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
};

/**
 * Natural Language Processor for the Data Modeler
 * This class handles processing natural language requests and converting them
 * into operations on the data model.
 */
export class NLProcessor {
  private dataModelId: string;
  private currentEntities: Entity[] = [];
  private currentAttributes: Record<string, Attribute[]> = {};
  private currentReferentials: Referential[] = [];
  private currentRelationships: Relationship[] = [];
  private currentRules: Rule[] = [];
  private pendingChanges: ModelChanges = {};

  constructor(dataModelId: string) {
    this.dataModelId = dataModelId;
  }

  /**
   * Process a natural language request
   * @param request The natural language request from the user
   * @param conversationHistory The history of the conversation
   * @returns A response with a message and any changes to be made
   */
  async processRequest(
    request: string,
    conversationHistory: Message[]
  ): Promise<NLProcessorResponse> {
    try {
      // First, load the current state of the data model
      await this.loadCurrentState();

      // Process the request using the AI model
      const aiResponse = await this.callAIModel(request, conversationHistory);

      // If the AI needs more information, return a response asking for it
      if (aiResponse.requiresMoreInfo) {
        return {
          message: aiResponse.message,
          requiresMoreInfo: true,
          requiredInfo: aiResponse.requiredInfo,
        };
      }

      // Store the pending changes
      this.pendingChanges = aiResponse.changes || {};

      // Return the response with the pending changes
      return {
        message: aiResponse.message,
        changes: this.pendingChanges,
      };
    } catch (error) {
      console.error('Error processing NL request:', error);
      throw new Error('Failed to process natural language request');
    }
  }

  /**
   * Generate a preview of the changes to be made to the data model
   * @returns A preview of the data model with the pending changes applied
   */
  generatePreview(): {
    entities: Entity[];
    attributes: Record<string, Attribute[]>;
    referentials: Referential[];
    relationships: Relationship[];
    rules: Rule[];
  } {
    // Create copies of the current state
    const previewEntities = [...this.currentEntities];
    const previewAttributes = { ...this.currentAttributes };
    const previewReferentials = [...this.currentReferentials];
    const previewRelationships = [...this.currentRelationships];
    const previewRules = [...this.currentRules];

    // Apply entity changes
    if (this.pendingChanges.entities) {
      // Handle entity creations
      if (this.pendingChanges.entities.create) {
        previewEntities.push(...this.pendingChanges.entities.create);
      }

      // Handle entity updates
      if (this.pendingChanges.entities.update) {
        this.pendingChanges.entities.update.forEach((update) => {
          const entityIndex = previewEntities.findIndex((e) => e.id === update.id);
          if (entityIndex !== -1) {
            previewEntities[entityIndex] = {
              ...previewEntities[entityIndex],
              ...update.changes,
            };
          }
        });
      }

      // Handle entity deletions
      if (this.pendingChanges.entities.delete) {
        this.pendingChanges.entities.delete.forEach((id) => {
          const entityIndex = previewEntities.findIndex((e) => e.id === id);
          if (entityIndex !== -1) {
            previewEntities.splice(entityIndex, 1);
          }
        });
      }
    }

    // Apply attribute changes
    if (this.pendingChanges.attributes) {
      // Handle attribute creations
      if (this.pendingChanges.attributes.create) {
        this.pendingChanges.attributes.create.forEach((attribute) => {
          if (!previewAttributes[attribute.entity_id]) {
            previewAttributes[attribute.entity_id] = [];
          }
          previewAttributes[attribute.entity_id].push(attribute);
        });
      }

      // Handle attribute updates
      if (this.pendingChanges.attributes.update) {
        this.pendingChanges.attributes.update.forEach((update) => {
          for (const entityId in previewAttributes) {
            const attributeIndex = previewAttributes[entityId].findIndex(
              (a) => a.id === update.id
            );
            if (attributeIndex !== -1) {
              previewAttributes[entityId][attributeIndex] = {
                ...previewAttributes[entityId][attributeIndex],
                ...update.changes,
              };
              break;
            }
          }
        });
      }

      // Handle attribute deletions
      if (this.pendingChanges.attributes.delete) {
        this.pendingChanges.attributes.delete.forEach((id) => {
          for (const entityId in previewAttributes) {
            const attributeIndex = previewAttributes[entityId].findIndex(
              (a) => a.id === id
            );
            if (attributeIndex !== -1) {
              previewAttributes[entityId].splice(attributeIndex, 1);
              break;
            }
          }
        });
      }
    }

    // Apply referential changes
    if (this.pendingChanges.referentials) {
      // Handle referential creations
      if (this.pendingChanges.referentials.create) {
        previewReferentials.push(...this.pendingChanges.referentials.create);
      }

      // Handle referential updates
      if (this.pendingChanges.referentials.update) {
        this.pendingChanges.referentials.update.forEach((update) => {
          const referentialIndex = previewReferentials.findIndex(
            (r) => r.id === update.id
          );
          if (referentialIndex !== -1) {
            previewReferentials[referentialIndex] = {
              ...previewReferentials[referentialIndex],
              ...update.changes,
            };
          }
        });
      }

      // Handle referential deletions
      if (this.pendingChanges.referentials.delete) {
        this.pendingChanges.referentials.delete.forEach((id) => {
          const referentialIndex = previewReferentials.findIndex((r) => r.id === id);
          if (referentialIndex !== -1) {
            previewReferentials.splice(referentialIndex, 1);
          }
        });
      }
    }

    // Apply relationship changes
    if (this.pendingChanges.relationships) {
      // Handle relationship creations
      if (this.pendingChanges.relationships.create) {
        previewRelationships.push(...this.pendingChanges.relationships.create);
      }

      // Handle relationship updates
      if (this.pendingChanges.relationships.update) {
        this.pendingChanges.relationships.update.forEach((update) => {
          const relationshipIndex = previewRelationships.findIndex(
            (r) => r.id === update.id
          );
          if (relationshipIndex !== -1) {
            previewRelationships[relationshipIndex] = {
              ...previewRelationships[relationshipIndex],
              ...update.changes,
            };
          }
        });
      }

      // Handle relationship deletions
      if (this.pendingChanges.relationships.delete) {
        this.pendingChanges.relationships.delete.forEach((id) => {
          const relationshipIndex = previewRelationships.findIndex((r) => r.id === id);
          if (relationshipIndex !== -1) {
            previewRelationships.splice(relationshipIndex, 1);
          }
        });
      }
    }

    // Apply rule changes
    if (this.pendingChanges.rules) {
      // Handle rule creations
      if (this.pendingChanges.rules.create) {
        previewRules.push(...this.pendingChanges.rules.create);
      }

      // Handle rule updates
      if (this.pendingChanges.rules.update) {
        this.pendingChanges.rules.update.forEach((update) => {
          const ruleIndex = previewRules.findIndex((r) => r.id === update.id);
          if (ruleIndex !== -1) {
            previewRules[ruleIndex] = {
              ...previewRules[ruleIndex],
              ...update.changes,
            };
          }
        });
      }

      // Handle rule deletions
      if (this.pendingChanges.rules.delete) {
        this.pendingChanges.rules.delete.forEach((id) => {
          const ruleIndex = previewRules.findIndex((r) => r.id === id);
          if (ruleIndex !== -1) {
            previewRules.splice(ruleIndex, 1);
          }
        });
      }
    }

    return {
      entities: previewEntities,
      attributes: previewAttributes,
      referentials: previewReferentials,
      relationships: previewRelationships,
      rules: previewRules,
    };
  }

  /**
   * Apply the pending changes to the data model
   * @returns A success message if the changes were applied successfully
   */
  async applyChanges(): Promise<string> {
    try {
      const supabase = createClient();

      // Apply entity changes
      if (this.pendingChanges.entities) {
        // Handle entity creations
        if (this.pendingChanges.entities.create && this.pendingChanges.entities.create.length > 0) {
          for (const entity of this.pendingChanges.entities.create) {
            const response = await fetch('/api/entities', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: entity.name,
                description: entity.description,
                data_model_id: this.dataModelId,
                entity_type: entity.entity_type || 'standard',
                position_x: entity.position_x || 100,
                position_y: entity.position_y || 100,
                referential_id: entity.referential_id,
              }),
            });

            if (!response.ok) {
              throw new Error(`Failed to create entity: ${entity.name}`);
            }
          }
        }

        // Handle entity updates
        if (this.pendingChanges.entities.update && this.pendingChanges.entities.update.length > 0) {
          for (const update of this.pendingChanges.entities.update) {
            const response = await fetch(`/api/entities/${update.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(update.changes),
            });

            if (!response.ok) {
              throw new Error(`Failed to update entity: ${update.id}`);
            }
          }
        }

        // Handle entity deletions
        if (this.pendingChanges.entities.delete && this.pendingChanges.entities.delete.length > 0) {
          for (const id of this.pendingChanges.entities.delete) {
            const response = await fetch(`/api/entities/${id}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              throw new Error(`Failed to delete entity: ${id}`);
            }
          }
        }
      }

      // Apply attribute changes
      if (this.pendingChanges.attributes) {
        // Handle attribute creations
        if (this.pendingChanges.attributes.create && this.pendingChanges.attributes.create.length > 0) {
          for (const attribute of this.pendingChanges.attributes.create) {
            const response = await fetch('/api/attributes', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: attribute.name,
                description: attribute.description,
                dataType: attribute.data_type,
                entityId: attribute.entity_id,
                isRequired: attribute.is_required,
                isUnique: attribute.is_unique,
                isPrimaryKey: attribute.is_primary_key,
                isForeignKey: attribute.is_foreign_key,
                referencedEntityId: attribute.referenced_entity_id,
                defaultValue: attribute.default_value,
                length: attribute.length,
              }),
            });

            if (!response.ok) {
              throw new Error(`Failed to create attribute: ${attribute.name}`);
            }
          }
        }

        // Handle attribute updates
        if (this.pendingChanges.attributes.update && this.pendingChanges.attributes.update.length > 0) {
          for (const update of this.pendingChanges.attributes.update) {
            const response = await fetch(`/api/attributes/${update.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: update.changes.name,
                description: update.changes.description,
                dataType: update.changes.data_type,
                isRequired: update.changes.is_required,
                isUnique: update.changes.is_unique,
                isPrimaryKey: update.changes.is_primary_key,
                isForeignKey: update.changes.is_foreign_key,
                referencedEntityId: update.changes.referenced_entity_id,
                defaultValue: update.changes.default_value,
                length: update.changes.length,
              }),
            });

            if (!response.ok) {
              throw new Error(`Failed to update attribute: ${update.id}`);
            }
          }
        }

        // Handle attribute deletions
        if (this.pendingChanges.attributes.delete && this.pendingChanges.attributes.delete.length > 0) {
          for (const id of this.pendingChanges.attributes.delete) {
            const response = await fetch(`/api/attributes/${id}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              throw new Error(`Failed to delete attribute: ${id}`);
            }
          }
        }
      }

      // Apply referential changes
      if (this.pendingChanges.referentials) {
        // Handle referential creations
        if (this.pendingChanges.referentials.create && this.pendingChanges.referentials.create.length > 0) {
          for (const referential of this.pendingChanges.referentials.create) {
            const response = await fetch('/api/referentials', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: referential.name,
                description: referential.description,
                color: referential.color,
                data_model_id: this.dataModelId,
              }),
            });

            if (!response.ok) {
              throw new Error(`Failed to create referential: ${referential.name}`);
            }
          }
        }

        // Handle referential updates
        if (this.pendingChanges.referentials.update && this.pendingChanges.referentials.update.length > 0) {
          for (const update of this.pendingChanges.referentials.update) {
            const response = await fetch(`/api/referentials/${update.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(update.changes),
            });

            if (!response.ok) {
              throw new Error(`Failed to update referential: ${update.id}`);
            }
          }
        }

        // Handle referential deletions
        if (this.pendingChanges.referentials.delete && this.pendingChanges.referentials.delete.length > 0) {
          for (const id of this.pendingChanges.referentials.delete) {
            const response = await fetch(`/api/referentials/${id}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              throw new Error(`Failed to delete referential: ${id}`);
            }
          }
        }
      }

      // Apply relationship changes
      if (this.pendingChanges.relationships) {
        // Handle relationship creations
        if (this.pendingChanges.relationships.create && this.pendingChanges.relationships.create.length > 0) {
          for (const relationship of this.pendingChanges.relationships.create) {
            // For creating relationships, we'll use the foreign key approach
            // by creating an attribute with is_foreign_key=true
            const response = await fetch('/api/attributes', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: `${relationship.name || 'fk_' + relationship.target_entity_id.substring(0, 8)}`,
                description: `Foreign key to related entity`,
                dataType: 'uuid', // Assuming UUID as default type for foreign keys
                entityId: relationship.source_entity_id,
                isRequired: false,
                isUnique: false,
                isPrimaryKey: false,
                isForeignKey: true,
                referencedEntityId: relationship.target_entity_id,
              }),
            });

            if (!response.ok) {
              throw new Error(`Failed to create relationship attribute`);
            }
          }
        }

        // Handle relationship updates
        if (this.pendingChanges.relationships.update && this.pendingChanges.relationships.update.length > 0) {
          for (const update of this.pendingChanges.relationships.update) {
            const response = await fetch(`/api/relationships`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                id: update.id,
                sourceCardinality: update.changes.source_cardinality,
                targetCardinality: update.changes.target_cardinality,
              }),
            });

            if (!response.ok) {
              throw new Error(`Failed to update relationship: ${update.id}`);
            }
          }
        }

        // Handle relationship deletions
        if (this.pendingChanges.relationships.delete && this.pendingChanges.relationships.delete.length > 0) {
          // For deleting relationships, we need to find the corresponding attribute
          // and delete it, as relationships are implemented as foreign key attributes
          for (const id of this.pendingChanges.relationships.delete) {
            // First, get the relationship to find the source attribute
            const response = await fetch(`/api/relationships?id=${id}`);
            if (!response.ok) {
              throw new Error(`Failed to fetch relationship: ${id}`);
            }
            
            const relationshipData = await response.json();
            if (relationshipData && relationshipData.source_attribute_id) {
              // Delete the attribute that implements this relationship
              const deleteResponse = await fetch(`/api/attributes/${relationshipData.source_attribute_id}`, {
                method: 'DELETE',
              });

              if (!deleteResponse.ok) {
                throw new Error(`Failed to delete relationship attribute: ${relationshipData.source_attribute_id}`);
              }
            }
          }
        }
      }

      // Apply rule changes
      if (this.pendingChanges.rules) {
        // Handle rule creations
        if (this.pendingChanges.rules.create && this.pendingChanges.rules.create.length > 0) {
          for (const rule of this.pendingChanges.rules.create) {
            const response = await fetch('/api/rules', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: rule.name,
                description: rule.description,
                rule_type: rule.rule_type,
                entity_id: rule.entity_id,
                attribute_id: rule.attribute_id,
                condition_expression: rule.condition_expression,
                action_expression: rule.action_expression,
                is_enabled: rule.is_enabled,
                severity: rule.severity,
                data_model_id: this.dataModelId,
              }),
            });

            if (!response.ok) {
              throw new Error(`Failed to create rule: ${rule.name}`);
            }
          }
        }

        // Handle rule updates
        if (this.pendingChanges.rules.update && this.pendingChanges.rules.update.length > 0) {
          for (const update of this.pendingChanges.rules.update) {
            const response = await fetch(`/api/rules/${update.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(update.changes),
            });

            if (!response.ok) {
              throw new Error(`Failed to update rule: ${update.id}`);
            }
          }
        }

        // Handle rule deletions
        if (this.pendingChanges.rules.delete && this.pendingChanges.rules.delete.length > 0) {
          for (const id of this.pendingChanges.rules.delete) {
            const response = await fetch(`/api/rules/${id}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              throw new Error(`Failed to delete rule: ${id}`);
            }
          }
        }
      }

      // Clear the pending changes
      this.pendingChanges = {};

      return 'Changes applied successfully';
    } catch (error) {
      console.error('Error applying changes:', error);
      throw new Error('Failed to apply changes to the data model');
    }
  }

  /**
   * Cancel the pending changes
   */
  cancelChanges(): void {
    this.pendingChanges = {};
  }

  /**
   * Load the current state of the data model
   * @private
   */
  private async loadCurrentState(): Promise<void> {
    try {
      const supabase = createClient();

      // Load entities
      const entitiesResponse = await fetch(`/api/entities?dataModelId=${this.dataModelId}`);
      if (!entitiesResponse.ok) {
        throw new Error('Failed to load entities');
      }
      const entitiesData = await entitiesResponse.json();
      this.currentEntities = entitiesData.entities || [];

      // Load attributes for each entity
      this.currentAttributes = {};
      for (const entity of this.currentEntities) {
        const attributesResponse = await fetch(`/api/attributes?entityId=${entity.id}`);
        if (!attributesResponse.ok) {
          throw new Error(`Failed to load attributes for entity: ${entity.id}`);
        }
        const attributesData = await attributesResponse.json();
        this.currentAttributes[entity.id] = attributesData.attributes || [];
      }

      // Load referentials
      const referentialsResponse = await fetch(`/api/referentials?dataModelId=${this.dataModelId}`);
      if (!referentialsResponse.ok) {
        throw new Error('Failed to load referentials');
      }
      const referentialsData = await referentialsResponse.json();
      this.currentReferentials = referentialsData.referentials || [];

      // Load relationships
      const relationshipsResponse = await fetch(`/api/relationships?dataModelId=${this.dataModelId}`);
      if (!relationshipsResponse.ok) {
        throw new Error('Failed to load relationships');
      }
      const relationshipsData = await relationshipsResponse.json();
      this.currentRelationships = relationshipsData.relationships || [];

      // Load rules
      const rulesResponse = await fetch(`/api/rules?dataModelId=${this.dataModelId}`);
      if (!rulesResponse.ok) {
        throw new Error('Failed to load rules');
      }
      const rulesData = await rulesResponse.json();
      this.currentRules = rulesData || [];
    } catch (error) {
      console.error('Error loading current state:', error);
      throw new Error('Failed to load current state of the data model');
    }
  }

  /**
   * Call the AI model to process the natural language request
   * @param request The natural language request from the user
   * @param conversationHistory The history of the conversation
   * @returns A response from the AI model
   * @private
   */
  private async callAIModel(
    request: string,
    conversationHistory: Message[]
  ): Promise<NLProcessorResponse> {
    try {
      // Prepare the current state data to send to the AI model
      const currentState = {
        entities: this.currentEntities,
        attributes: this.currentAttributes,
        referentials: this.currentReferentials,
        relationships: this.currentRelationships,
        rules: this.currentRules,
      };

      // Convert conversation history to the format expected by the AI model
      const history = conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call the AI model API
      const response = await fetch('/api/nl-interface/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request,
          history,
          currentState,
          dataModelId: this.dataModelId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process request with AI model');
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling AI model:', error);
      throw new Error('Failed to process request with AI model');
    }
  }
}
