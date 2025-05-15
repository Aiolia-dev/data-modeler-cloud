// No need to import OpenAI as we'll use our server-side API endpoint

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
};

export type ModelChange = {
  type: 'create' | 'update' | 'delete';
  operation?: 'add_entity' | 'add_attribute' | 'modify_entity' | 'modify_attribute' | 'delete_entity' | 'delete_attribute' | 'add_relationship' | 'modify_relationship' | 'delete_relationship' | 'add_join_entity';
  entity?: string;
  attribute?: string;
  data_type?: string;
  is_required?: boolean;
  is_unique?: boolean;
  is_primary_key?: boolean;
  default_value?: string;
  length?: number;
  description?: string;
  referential?: string;
  relationship?: string;
  rule?: string;
  // Join entity specific properties
  source_entity?: string;
  target_entity?: string;
  // Standard entity positioning properties
  positionX?: number;
  positionY?: number;
  referenceEntityId?: string;
  referenceEntityName?: string; // Added for direct entity name reference
  referenceEntityOffset?: number;
  details: string;
};

export type ProcessResponse = {
  message: string;
  changes: ModelChange[];
  need_more_info?: boolean;
  missing_info?: string;
};

class NLProcessor {
  private projectId: string;
  private modelId: string;
  pendingChanges: ModelChange[] | null = null;
  pendingEntityId: string | null = null; // Store the ID of the entity waiting for positioning

  constructor(projectId: string, modelId: string) {
    this.projectId = projectId;
    this.modelId = modelId;
  }

  async processRequest(userInput: string, previousMessages: Message[]): Promise<ProcessResponse> {
    try {
      console.log('Processing request with NLProcessor');
      console.log('Project ID:', this.projectId);
      console.log('Model ID:', this.modelId);
      
      // Format previous messages for the API
      const formattedMessages = previousMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      // Add the current user input
      formattedMessages.push({
        role: 'user' as const,
        content: userInput
      });

      console.log('Calling server-side API endpoint...');
      
      // Call our server-side API endpoint
      const response = await fetch('/api/nl-interface/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: formattedMessages,
          projectId: this.projectId,
          modelId: this.modelId,
        }),
      });

      console.log('API response status:', response.status);
      
      if (!response.ok) {
        // If the API returns an error, try to get the error message
        const errorData = await response.json().catch(() => null);
        console.error('API error:', errorData || response.statusText);
        
        // Return an error message instead of using mock response
        return {
          message: `I'm having trouble processing your request. Please ensure your OpenAI API key is correctly configured in the .env.local file and try again. Error: ${errorData?.error || response.statusText}`,
          changes: []
        };
      }

      const data = await response.json();
      console.log('API response data:', data);
      
      // Process any operations
      if (data.changes && Array.isArray(data.changes)) {
        // First, process all entity creations
        for (const change of data.changes) {
          if (change.type === 'create' && change.operation === 'add_entity') {
            await this.createEntity(change);
          }
        }
        
        // Then process other operations
        for (const change of data.changes) {
          if (change.type === 'create' && change.operation === 'add_attribute') {
            await this.createAttribute(change);
          } else if (change.type === 'create' && change.operation === 'add_join_entity') {
            await this.createJoinEntity(change);
          }
          // Skip entity creation since we already processed them
        }
      }
      
      return {
        message: data.message || 'I understand your request and have prepared the changes.',
        changes: data.changes || [],
        need_more_info: data.need_more_info || false,
        missing_info: data.missing_info || ''
      };
    } catch (error) {
      console.error('Error calling API:', error);
      
      // Provide more detailed error logging
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Return an error message instead of using mock response
      return {
        message: `I encountered an error while processing your request. Please ensure your OpenAI API key is correctly configured and try again. Error: ${error instanceof Error ? error.message : String(error)}`,
        changes: []
      };
    }
  }

  /**
   * Creates an attribute using the dedicated API endpoint
   */
  private async createAttribute(change: ModelChange): Promise<void> {
    if (!change.entity || !change.attribute || !change.data_type) {
      console.error('Missing required fields for attribute creation:', change);
      return;
    }
    
    try {
      console.log('Creating attribute:', change);
      
      const response = await fetch('/api/nl-interface/create-attribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attributeName: change.attribute,
          entityName: change.entity,
          dataType: change.data_type,
          description: change.description || null,
          isRequired: change.is_required || false,
          isUnique: change.is_unique || false,
          isPrimaryKey: change.is_primary_key || false,
          defaultValue: change.default_value || null,
          length: change.length || null,
          modelId: this.modelId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error creating attribute:', errorData || response.statusText);
        throw new Error(`Failed to create attribute: ${errorData?.error || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Attribute created successfully:', data);
    } catch (error) {
      console.error('Error in createAttribute:', error);
      throw error;
    }
  }
  
  /**
   * Creates a join entity between two existing entities
   */
  private async createJoinEntity(change: ModelChange): Promise<void> {
    if (!change.entity || !change.source_entity || !change.target_entity) {
      console.error('Missing required fields for join entity creation:', change);
      return;
    }
    
    try {
      console.log('Creating join entity:', change);
      
      const response = await fetch('/api/nl-interface/create-join-entity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityName: change.entity,
          sourceEntityName: change.source_entity,
          targetEntityName: change.target_entity,
          description: change.description || null,
          modelId: this.modelId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error creating join entity:', errorData || response.statusText);
        throw new Error(`Failed to create join entity: ${errorData?.error || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Join entity created successfully:', data);
    } catch (error) {
      console.error('Error in createJoinEntity:', error);
      throw error;
    }
  }
  
  /**
   * Creates a standard entity
   */
  async createEntity(change: ModelChange): Promise<void> {
    if (!change.entity) {
      console.error('Missing required fields for entity creation:', change);
      return;
    }
    
    try {
      console.log('Creating standard entity:', change);
      
      // Prepare request body
      const requestBody: any = {
        entityName: change.entity,
        description: change.description || null,
        modelId: this.modelId
      };
      
      // If there's a reference entity for positioning, include it
      if (change.referenceEntityId) {
        requestBody.referenceEntityId = change.referenceEntityId;
        requestBody.referenceEntityOffset = change.referenceEntityOffset || 250;
      } else if (change.referenceEntityName) {
        // If we have a reference entity name, include it
        requestBody.referenceEntityName = change.referenceEntityName;
        requestBody.referenceEntityOffset = change.referenceEntityOffset || 250;
      } else if (change.positionX !== undefined && change.positionY !== undefined) {
        requestBody.positionX = change.positionX;
        requestBody.positionY = change.positionY;
      }
      
      const response = await fetch('/api/nl-interface/create-entity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error creating entity:', errorData || response.statusText);
        throw new Error(`Failed to create entity: ${errorData?.error || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Standard entity created successfully:', data);
      
      // Store the entity ID for later use in positioning
      if (data.entity && data.entity.id) {
        this.pendingEntityId = data.entity.id;
        console.log('Stored pending entity ID for positioning:', this.pendingEntityId);
      }
    } catch (error) {
      console.error('Error in createEntity:', error);
      throw error;
    }
  }
  
  /**
   * Updates an existing entity's position
   */
  async updateEntityPosition(entityId: string, referenceEntityName: string): Promise<void> {
    if (!entityId || !referenceEntityName) {
      console.error('Missing required fields for entity position update:', { entityId, referenceEntityName });
      return;
    }
    
    try {
      console.log('Updating entity position:', { entityId, referenceEntityName });
      
      const response = await fetch('/api/nl-interface/update-entity-position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityId,
          modelId: this.modelId,
          referenceEntityName,
          referenceEntityOffset: 250 // Default offset
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error updating entity position:', errorData || response.statusText);
        throw new Error(`Failed to update entity position: ${errorData?.error || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Entity position updated successfully:', data);
      
      // Clear the pending entity ID since we've handled it
      this.pendingEntityId = null;
    } catch (error) {
      console.error('Error in updateEntityPosition:', error);
      throw error;
    }
  }
}

export default NLProcessor;
