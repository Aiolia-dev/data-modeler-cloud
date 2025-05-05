import { createClient } from './server';
import { Database } from '@/types/database.types';

// Type definitions for better type safety
export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export type ProjectMember = Database['public']['Tables']['project_members']['Row'];
export type ProjectMemberInsert = Database['public']['Tables']['project_members']['Insert'];

export type DataModel = Database['public']['Tables']['data_models']['Row'];
export type DataModelInsert = Database['public']['Tables']['data_models']['Insert'];
export type DataModelUpdate = Database['public']['Tables']['data_models']['Update'];

export type Entity = Database['public']['Tables']['entities']['Row'];
export type EntityInsert = Database['public']['Tables']['entities']['Insert'];
export type EntityUpdate = Database['public']['Tables']['entities']['Update'];

export type Attribute = Database['public']['Tables']['attributes']['Row'];
export type AttributeInsert = Database['public']['Tables']['attributes']['Insert'];
export type AttributeUpdate = Database['public']['Tables']['attributes']['Update'];

export type Relationship = Database['public']['Tables']['relationships']['Row'];
export type RelationshipInsert = Database['public']['Tables']['relationships']['Insert'];
export type RelationshipUpdate = Database['public']['Tables']['relationships']['Update'];

export type Comment = Database['public']['Tables']['comments']['Row'];
export type CommentInsert = Database['public']['Tables']['comments']['Insert'];

export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert'];

// Project operations
export async function getProjects() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getProject(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createProject(project: ProjectInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateProject(id: string, project: ProjectUpdate) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .update(project)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

// Project members operations
export async function getProjectMembers(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_members')
    .select(`
      *,
      user:user_id (
        id,
        email,
        user_metadata
      )
    `)
    .eq('project_id', projectId);
  
  if (error) throw error;
  return data;
}

export async function addProjectMember(member: ProjectMemberInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_members')
    .insert(member)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateProjectMemberRole(id: string, role: 'owner' | 'editor' | 'viewer') {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function removeProjectMember(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

// Data model operations
export async function getDataModels(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('data_models')
    .select('*')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getDataModel(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('data_models')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createDataModel(dataModel: DataModelInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('data_models')
    .insert(dataModel)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateDataModel(id: string, dataModel: DataModelUpdate) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('data_models')
    .update(dataModel)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteDataModel(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('data_models')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

// Entity operations
export async function getEntities(dataModelId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('entities')
    .select('*')
    .eq('data_model_id', dataModelId);
  
  if (error) throw error;
  return data;
}

export async function getEntity(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('entities')
    .select(`
      *,
      attributes(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createEntity(entity: EntityInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('entities')
    .insert(entity)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateEntity(id: string, entity: EntityUpdate) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('entities')
    .update(entity)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteEntity(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('entities')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

// Attribute operations
export async function getAttributes(entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('attributes')
    .select('*')
    .eq('entity_id', entityId);
  
  if (error) throw error;
  return data;
}

export async function getAttribute(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('attributes')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createAttribute(attribute: AttributeInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('attributes')
    .insert(attribute)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateAttribute(id: string, attribute: AttributeUpdate) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('attributes')
    .update(attribute)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteAttribute(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('attributes')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

// Relationship operations
export async function getRelationships(dataModelId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('relationships')
    .select(`
      *,
      source_entity:source_entity_id(id, name),
      target_entity:target_entity_id(id, name),
      source_attribute:source_attribute_id(id, name),
      target_attribute:target_attribute_id(id, name)
    `)
    .eq('data_model_id', dataModelId);
  
  if (error) throw error;
  return data;
}

export async function getRelationship(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('relationships')
    .select(`
      *,
      source_entity:source_entity_id(id, name),
      target_entity:target_entity_id(id, name),
      source_attribute:source_attribute_id(id, name),
      target_attribute:target_attribute_id(id, name)
    `)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createRelationship(relationship: RelationshipInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('relationships')
    .insert(relationship)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateRelationship(id: string, relationship: RelationshipUpdate) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('relationships')
    .update(relationship)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteRelationship(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('relationships')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

// Comment operations
export async function getComments(type: 'entity' | 'attribute' | 'relationship', id: string) {
  const supabase = await createClient();
  const column = `${type}_id`;
  
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:user_id(id, email, user_metadata)
    `)
    .eq(column, id)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function createComment(comment: CommentInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('comments')
    .insert(comment)
    .select(`
      *,
      user:user_id(id, email, user_metadata)
    `)
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteComment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

// Audit log operations
export async function createAuditLog(auditLog: AuditLogInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .insert(auditLog)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getAuditLogs(dataModelId: string, limit = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      user:user_id(id, email, user_metadata),
      entity:entity_id(id, name),
      attribute:attribute_id(id, name),
      relationship:relationship_id(id, name)
    `)
    .eq('data_model_id', dataModelId)
    .order('timestamp', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

// Get complete data model with all related data
export async function getCompleteDataModel(dataModelId: string) {
  const supabase = await createClient();
  
  // Get the data model
  const { data: dataModel, error: dataModelError } = await supabase
    .from('data_models')
    .select('*')
    .eq('id', dataModelId)
    .single();
  
  if (dataModelError) throw dataModelError;
  
  // Get all entities with their attributes
  const { data: entities, error: entitiesError } = await supabase
    .from('entities')
    .select(`
      *,
      attributes(*)
    `)
    .eq('data_model_id', dataModelId);
  
  if (entitiesError) throw entitiesError;
  
  // Get all relationships
  const { data: relationships, error: relationshipsError } = await supabase
    .from('relationships')
    .select(`
      *,
      source_entity:source_entity_id(id, name),
      target_entity:target_entity_id(id, name),
      source_attribute:source_attribute_id(id, name),
      target_attribute:target_attribute_id(id, name)
    `)
    .eq('data_model_id', dataModelId);
  
  if (relationshipsError) throw relationshipsError;
  
  return {
    dataModel,
    entities,
    relationships
  };
}

// Export a data model to JSON
export async function exportDataModelToJson(dataModelId: string) {
  const modelData = await getCompleteDataModel(dataModelId);
  return JSON.stringify(modelData, null, 2);
}

// Import a data model from JSON
export async function importDataModelFromJson(projectId: string, userId: string, jsonData: string) {
  const supabase = await createClient();
  
  try {
    const parsedData = JSON.parse(jsonData);
    const { dataModel, entities, relationships } = parsedData;
    
    // Create new data model
    const { data: newDataModel, error: dataModelError } = await supabase
      .from('data_models')
      .insert({
        project_id: projectId,
        name: `${dataModel.name} (Imported)`,
        description: dataModel.description,
        created_by: userId,
        version: dataModel.version
      })
      .select()
      .single();
    
    if (dataModelError) throw dataModelError;
    
    // Create entities map to track old IDs to new IDs
    const entityIdMap = new Map();
    const attributeIdMap = new Map();
    
    // Create entities and their attributes
    for (const entity of entities) {
      const { data: newEntity, error: entityError } = await supabase
        .from('entities')
        .insert({
          data_model_id: newDataModel.id,
          name: entity.name,
          description: entity.description,
          position_x: entity.position_x,
          position_y: entity.position_y
        })
        .select()
        .single();
      
      if (entityError) throw entityError;
      
      // Map old entity ID to new entity ID
      entityIdMap.set(entity.id, newEntity.id);
      
      // Create attributes for this entity
      for (const attribute of entity.attributes) {
        const { data: newAttribute, error: attributeError } = await supabase
          .from('attributes')
          .insert({
            entity_id: newEntity.id,
            name: attribute.name,
            data_type: attribute.data_type,
            description: attribute.description,
            is_primary_key: attribute.is_primary_key,
            is_foreign_key: attribute.is_foreign_key,
            is_unique: attribute.is_unique,
            is_mandatory: attribute.is_mandatory,
            is_calculated: attribute.is_calculated,
            calculation_rule: attribute.calculation_rule
            // We'll handle dependent_attribute_id in a second pass
          })
          .select()
          .single();
        
        if (attributeError) throw attributeError;
        
        // Map old attribute ID to new attribute ID
        attributeIdMap.set(attribute.id, newAttribute.id);
      }
    }
    
    // Update dependent attributes now that we have all attribute IDs
    for (const entity of entities) {
      for (const attribute of entity.attributes) {
        if (attribute.dependent_attribute_id) {
          const newAttributeId = attributeIdMap.get(attribute.id);
          const newDependentAttributeId = attributeIdMap.get(attribute.dependent_attribute_id);
          
          if (newAttributeId && newDependentAttributeId) {
            await supabase
              .from('attributes')
              .update({
                dependent_attribute_id: newDependentAttributeId
              })
              .eq('id', newAttributeId);
          }
        }
      }
    }
    
    // Create relationships
    for (const relationship of relationships) {
      const newSourceEntityId = entityIdMap.get(relationship.source_entity_id);
      const newTargetEntityId = entityIdMap.get(relationship.target_entity_id);
      const newSourceAttributeId = relationship.source_attribute_id ? attributeIdMap.get(relationship.source_attribute_id) : null;
      const newTargetAttributeId = relationship.target_attribute_id ? attributeIdMap.get(relationship.target_attribute_id) : null;
      
      if (newSourceEntityId && newTargetEntityId) {
        await supabase
          .from('relationships')
          .insert({
            data_model_id: newDataModel.id,
            source_entity_id: newSourceEntityId,
            target_entity_id: newTargetEntityId,
            source_attribute_id: newSourceAttributeId,
            target_attribute_id: newTargetAttributeId,
            relationship_type: relationship.relationship_type,
            name: relationship.name
          });
      }
    }
    
    return newDataModel;
  } catch (error) {
    console.error('Error importing data model:', error);
    throw new Error('Failed to import data model');
  }
}
