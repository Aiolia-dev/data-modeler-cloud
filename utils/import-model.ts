import { v4 as uuidv4 } from 'uuid';

// Types for the imported JSON format
interface ImportedAttribute {
  id: string;
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  isUnique: boolean;
  isForeignKey: boolean;
  referencesEntityId?: string | null;
  referencesAttributeId?: string | null;
  defaultValue?: string;
  description?: string;
  validationStatus?: string;
  isMandatory?: boolean;
  isCalculated?: boolean;
  businessRules?: string;
}

interface ImportedEntity {
  id: string;
  name: string;
  description?: string;
  attributes: ImportedAttribute[];
  position?: { x: number; y: number };
  color?: string;
  borderColor?: string;
  isJoinTable?: boolean;
  updatedAt?: string;
  referential?: string;
}

interface ImportedRelationship {
  id: string;
  name?: string;
  description?: string;
  sourceEntityId: string;
  targetEntityId: string;
  sourceCardinality?: string;
  targetCardinality?: string;
  type?: string;
  relationshipNaming?: {
    sourceToTarget?: string;
    targetToSource?: string;
  };
}

interface ImportedDataModel {
  entities: ImportedEntity[];
  relationships: ImportedRelationship[];
}

interface ImportedProject {
  name: string;
  description?: string;
  createdBy?: string;
  id: string;
  createdAt?: string;
  updatedAt?: string;
  version?: string;
}

interface ImportedFullModel {
  project?: ImportedProject;
  dataModel: ImportedDataModel;
}

// Types for our Supabase database schema
interface DbEntity {
  id: string;
  name: string;
  description: string | null;
  data_model_id: string;
  position_x: number | null;
  position_y: number | null;
  entity_type: 'standard' | 'join';
  join_entities?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

interface DbAttribute {
  id: string;
  entity_id: string;
  name: string;
  data_type: string;
  description: string | null;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  referenced_entity_id: string | null;
  is_unique: boolean;
  is_required: boolean;
  default_value: string | null;
  length: number | null;
  is_calculated: boolean;
  calculation_rule: string | null;
  dependent_attribute_id: string | null;
  created_at?: string;
  updated_at?: string;
}

interface DbRelationship {
  id: string;
  data_model_id: string;
  source_entity_id: string;
  target_entity_id: string;
  source_attribute_id: string | null;
  target_attribute_id: string | null;
  relationship_type: string;
  name: string | null;
  created_at?: string;
  updated_at?: string;
}

interface DbDataModel {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  version: string;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ConversionResult {
  dataModel: DbDataModel;
  entities: DbEntity[];
  attributes: DbAttribute[];
  relationships: DbRelationship[];
}

// Map imported data types to our database data types
const mapDataType = (importedType: string): string => {
  const typeMap: Record<string, string> = {
    'text': 'varchar',
    'varchar': 'varchar',
    'integer': 'integer',
    'int': 'integer',
    'number': 'integer',
    'decimal': 'decimal',
    'float': 'float',
    'double': 'double',
    'boolean': 'boolean',
    'bool': 'boolean',
    'date': 'date',
    'datetime': 'timestamp',
    'timestamp': 'timestamp',
    'time': 'time',
    'uuid': 'uuid',
    'json': 'json',
    'jsonb': 'jsonb',
    'array': 'array',
  };

  return typeMap[importedType.toLowerCase()] || 'varchar';
};

// Convert imported model to our database schema
export const convertImportedModel = (
  importedModel: ImportedFullModel, 
  projectId: string, 
  modelName: string,
  userId: string | null
): ConversionResult => {
  // Create a new data model
  const dataModelId = uuidv4();
  const now = new Date().toISOString();
  
  // Use imported model name if available
  const finalModelName = importedModel.project?.name || modelName;
  
  const dataModel: DbDataModel = {
    id: dataModelId,
    project_id: projectId,
    name: finalModelName,
    description: importedModel.project?.description || 'Imported data model',
    version: importedModel.project?.version || '1.0',
    created_by: userId,
    created_at: now,
    updated_at: now,
  };

  // Get entities and relationships from the dataModel property
  const importedEntities = importedModel.dataModel.entities;
  const importedRelationships = importedModel.dataModel.relationships;

  // Map to track old entity IDs to new entity IDs
  const entityIdMap: Record<string, string> = {};
  
  // Convert entities
  const entities: DbEntity[] = importedEntities.map(importedEntity => {
    const newEntityId = uuidv4();
    entityIdMap[importedEntity.id] = newEntityId;
    
    return {
      id: newEntityId,
      name: importedEntity.name,
      description: importedEntity.description || null,
      data_model_id: dataModelId,
      position_x: importedEntity.position?.x || 0,
      position_y: importedEntity.position?.y || 0,
      entity_type: importedEntity.isJoinTable ? 'join' : 'standard',
      created_at: now,
      updated_at: now,
    };
  });

  // Map to track old attribute IDs to new attribute IDs
  const attributeIdMap: Record<string, string> = {};
  
  // Convert attributes
  const attributes: DbAttribute[] = [];
  
  importedEntities.forEach((importedEntity, entityIndex) => {
    const entityId = entities[entityIndex].id;
    
    importedEntity.attributes.forEach(importedAttr => {
      const newAttributeId = uuidv4();
      if (importedAttr.id) {
        attributeIdMap[importedAttr.id] = newAttributeId;
      }
      
      // Map the referenced entity ID if it exists
      let referencedEntityId = null;
      if (importedAttr.referencesEntityId && entityIdMap[importedAttr.referencesEntityId]) {
        referencedEntityId = entityIdMap[importedAttr.referencesEntityId];
      }
      
      attributes.push({
        id: newAttributeId,
        entity_id: entityId,
        name: importedAttr.name,
        data_type: mapDataType(importedAttr.dataType),
        description: importedAttr.description || null,
        is_primary_key: importedAttr.isPrimaryKey || false,
        is_foreign_key: importedAttr.isForeignKey || false,
        referenced_entity_id: referencedEntityId,
        is_unique: importedAttr.isUnique || false,
        is_required: importedAttr.isMandatory || !importedAttr.isNullable || false,
        default_value: importedAttr.defaultValue || null,
        length: null, // Not provided in the import format
        is_calculated: importedAttr.isCalculated || false,
        calculation_rule: importedAttr.businessRules || null, // Use businessRules if available
        dependent_attribute_id: null, // Not provided in the import format
        created_at: now,
        updated_at: now,
      });
    });
  });

  // Convert relationships
  const relationships: DbRelationship[] = [];
  
  // Process each relationship
  for (const importedRel of importedRelationships) {
    // Find the source and target entities
    const sourceEntity = importedEntities.find(e => e.id === importedRel.sourceEntityId);
    const targetEntity = importedEntities.find(e => e.id === importedRel.targetEntityId);
    
    if (!sourceEntity || !targetEntity) continue;
    
    // Get the mapped entity IDs
    const sourceEntityId = entityIdMap[importedRel.sourceEntityId] || '';
    const targetEntityId = entityIdMap[importedRel.targetEntityId] || '';
    
    // Find source and target attributes (assuming they are foreign keys)
    let sourceAttributeId: string | null = null;
    let targetAttributeId: string | null = null;
    
    // Try to find a matching foreign key attribute
    for (const attr of attributes) {
      if (attr.entity_id === sourceEntityId && attr.is_foreign_key && attr.referenced_entity_id === targetEntityId) {
        sourceAttributeId = attr.id;
      } else if (attr.entity_id === targetEntityId && attr.is_foreign_key && attr.referenced_entity_id === sourceEntityId) {
        targetAttributeId = attr.id;
      }
    }
    
    // Detect join table pattern: standard entity to join entity
    const isSourceJoin = sourceEntity.isJoinTable === true;
    const isTargetJoin = targetEntity.isJoinTable === true;
    const now = new Date().toISOString();

    // If one side is join and the other is standard, always set:
    //   source = standard entity, target = join entity, type = one-to-many
    if (!isSourceJoin && isTargetJoin) {
      relationships.push({
        id: uuidv4(),
        data_model_id: dataModelId,
        source_entity_id: sourceEntityId,
        target_entity_id: targetEntityId,
        source_attribute_id: sourceAttributeId,
        target_attribute_id: targetAttributeId,
        relationship_type: 'one-to-many',
        name: importedRel.name || null,
        created_at: now,
        updated_at: now,
      });
    } else if (isSourceJoin && !isTargetJoin) {
      // If source is join and target is standard, reverse so standard is source
      relationships.push({
        id: uuidv4(),
        data_model_id: dataModelId,
        source_entity_id: targetEntityId,
        target_entity_id: sourceEntityId,
        source_attribute_id: targetAttributeId,
        target_attribute_id: sourceAttributeId,
        relationship_type: 'one-to-many',
        name: importedRel.name || null,
        created_at: now,
        updated_at: now,
      });
    } else {
      // Otherwise, use the original logic
      let relationshipType = 'one-to-many';
      if (importedRel.type === 'many-to-many') {
        relationshipType = 'many-to-many';
      } else {
        const sourceCardinality = importedRel.sourceCardinality || '1';
        const targetCardinality = importedRel.targetCardinality || 'n';
        const isSourceMany = sourceCardinality.includes('n') || sourceCardinality.includes('*') || sourceCardinality.includes('many');
        const isTargetMany = targetCardinality.includes('n') || targetCardinality.includes('*') || targetCardinality.includes('many');
        if (isSourceMany && isTargetMany) {
          relationshipType = 'many-to-many';
        } else if (!isSourceMany && !isTargetMany) {
          relationshipType = 'one-to-one';
        } else {
          relationshipType = 'one-to-many';
        }
      }
      relationships.push({
        id: uuidv4(),
        data_model_id: dataModelId,
        source_entity_id: sourceEntityId,
        target_entity_id: targetEntityId,
        source_attribute_id: sourceAttributeId,
        target_attribute_id: targetAttributeId,
        relationship_type: relationshipType,
        name: importedRel.name || null,
        created_at: now,
        updated_at: now,
      });
    }
  }
  
  return {
    dataModel,
    entities,
    attributes,
    relationships,
  };
};

// Parse and validate the imported JSON file
export const parseImportedModel = async (file: File): Promise<ImportedFullModel> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        if (!event.target || typeof event.target.result !== 'string') {
          throw new Error('Failed to read file');
        }
        
        const jsonData = JSON.parse(event.target.result);
        
        // Check if it's the new format with nested dataModel
        if (jsonData.dataModel) {
          // Validate the new JSON structure
          if (!jsonData.dataModel.entities || !Array.isArray(jsonData.dataModel.entities)) {
            throw new Error('Invalid JSON format: Missing entities array in dataModel');
          }
          
          if (!jsonData.dataModel.relationships || !Array.isArray(jsonData.dataModel.relationships)) {
            throw new Error('Invalid JSON format: Missing relationships array in dataModel');
          }
          
          resolve(jsonData as ImportedFullModel);
        } else {
          // Handle the old format (direct entities and relationships)
          if (!jsonData.entities || !Array.isArray(jsonData.entities)) {
            throw new Error('Invalid JSON format: Missing entities array');
          }
          
          if (!jsonData.relationships || !Array.isArray(jsonData.relationships)) {
            throw new Error('Invalid JSON format: Missing relationships array');
          }
          
          // Convert old format to new format
          const convertedData: ImportedFullModel = {
            dataModel: {
              entities: jsonData.entities,
              relationships: jsonData.relationships
            }
          };
          
          resolve(convertedData);
        }
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse JSON'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};
