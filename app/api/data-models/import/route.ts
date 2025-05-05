import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { convertImportedModel } from '@/utils/import-model';

export async function POST(req: NextRequest) {
  console.log('POST /api/data-models/import - Importing data model');
  
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        { error: 'Authentication error', details: userError.message },
        { status: 401 }
      );
    }
    
    if (!user) {
      console.error('No user found');
      return NextResponse.json(
        { error: 'Unauthorized - No user found' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const formData = await req.formData();
    const projectId = formData.get('projectId') as string;
    const modelName = formData.get('modelName') as string;
    const file = formData.get('file') as File;
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    if (!modelName) {
      return NextResponse.json({ error: 'Model name is required' }, { status: 400 });
    }
    
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }
    
    // Read and parse the file
    const fileContent = await file.text();
    let importedModel;
    
    try {
      importedModel = JSON.parse(fileContent);
      
      // Check if it's the new format with nested dataModel
      if (importedModel.dataModel) {
        // Validate the new JSON structure
        if (!importedModel.dataModel.entities || !Array.isArray(importedModel.dataModel.entities)) {
          throw new Error('Invalid JSON format: Missing entities array in dataModel');
        }
        
        if (!importedModel.dataModel.relationships || !Array.isArray(importedModel.dataModel.relationships)) {
          throw new Error('Invalid JSON format: Missing relationships array in dataModel');
        }
      } else {
        // Handle the old format (direct entities and relationships)
        if (!importedModel.entities || !Array.isArray(importedModel.entities)) {
          throw new Error('Invalid JSON format: Missing entities array');
        }
        
        if (!importedModel.relationships || !Array.isArray(importedModel.relationships)) {
          throw new Error('Invalid JSON format: Missing relationships array');
        }
        
        // Convert old format to new format
        importedModel = {
          dataModel: {
            entities: importedModel.entities,
            relationships: importedModel.relationships
          }
        };
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return NextResponse.json(
        { error: 'Invalid JSON file', details: error instanceof Error ? error.message : 'Failed to parse JSON' },
        { status: 400 }
      );
    }
    
    // Convert the imported model to our database schema
    const { dataModel, entities, attributes, relationships } = convertImportedModel(
      importedModel,
      projectId,
      modelName,
      user.id
    );
    
    // Use admin client to bypass RLS policies
    const adminClient = createAdminClient();
    
    // Insert the data model
    const { data: insertedDataModel, error: dataModelError } = await adminClient
      .from('data_models')
      .insert(dataModel)
      .select()
      .single();
    
    if (dataModelError) {
      console.error('Error inserting data model:', dataModelError);
      return NextResponse.json(
        { error: 'Failed to create data model', details: dataModelError.message },
        { status: 500 }
      );
    }
    
    // Insert entities one by one to avoid type issues
    for (const entity of entities) {
      const { error: entityError } = await adminClient
        .from('entities')
        .insert({
          id: entity.id,
          name: entity.name,
          description: entity.description,
          data_model_id: entity.data_model_id,
          position_x: entity.position_x === null ? undefined : entity.position_x,
          position_y: entity.position_y === null ? undefined : entity.position_y,
          entity_type: entity.entity_type,
          created_at: entity.created_at,
          updated_at: entity.updated_at
        });
      
      if (entityError) {
        console.error('Error inserting entity:', entityError);
        // Attempt to clean up the data model
        await adminClient.from('data_models').delete().eq('id', dataModel.id);
        return NextResponse.json(
          { error: 'Failed to create entity', details: entityError.message },
          { status: 500 }
        );
      }
    }
    
    // Insert attributes in batches to avoid type issues
    const attributeBatches = [];
    const batchSize = 50; // Adjust based on your database limits
    
    for (let i = 0; i < attributes.length; i += batchSize) {
      attributeBatches.push(attributes.slice(i, i + batchSize));
    }
    
    for (const batch of attributeBatches) {
      const { error: attributesError } = await adminClient
        .from('attributes')
        .insert(batch.map(attr => ({
          id: attr.id,
          entity_id: attr.entity_id,
          name: attr.name,
          data_type: attr.data_type,
          description: attr.description,
          is_primary_key: attr.is_primary_key,
          is_foreign_key: attr.is_foreign_key,
          referenced_entity_id: attr.referenced_entity_id,
          is_unique: attr.is_unique,
          is_required: attr.is_required,
          default_value: attr.default_value,
          length: attr.length,
          is_calculated: attr.is_calculated,
          calculation_rule: attr.calculation_rule,
          dependent_attribute_id: attr.dependent_attribute_id,
          created_at: attr.created_at,
          updated_at: attr.updated_at
        })));
      
      if (attributesError) {
        console.error('Error inserting attributes:', attributesError);
        // Attempt to clean up entities and data model
        await adminClient.from('entities').delete().eq('data_model_id', dataModel.id);
        await adminClient.from('data_models').delete().eq('id', dataModel.id);
        return NextResponse.json(
          { error: 'Failed to create attributes', details: attributesError.message },
          { status: 500 }
        );
      }
    }
    
    // Check for join entities to correctly handle cardinality
    const entityTypeMap: Record<string, string> = {};
    for (const entity of entities) {
      entityTypeMap[entity.id] = entity.entity_type || 'regular';
    }
    
    // Insert relationships one by one to avoid type issues
    for (const relationship of relationships) {
      // Ensure relationship_type is one of the allowed values
      let relationshipType = relationship.relationship_type;
      if (!['one-to-one', 'one-to-many', 'many-to-many'].includes(relationshipType)) {
        relationshipType = 'one-to-many'; // Default if not recognized
      }
      
      // Check if source or target is a join entity
      const isSourceJoin = entityTypeMap[relationship.source_entity_id] === 'join';
      const isTargetJoin = entityTypeMap[relationship.target_entity_id] === 'join';
      
      // For join entities, we need to swap the source and target entities to get correct cardinality
      let sourceEntityId = relationship.source_entity_id;
      let targetEntityId = relationship.target_entity_id;
      let sourceAttributeId = relationship.source_attribute_id;
      let targetAttributeId = relationship.target_attribute_id;
      
      // If the relationship involves a join entity, we need special handling
      if (isSourceJoin || isTargetJoin) {
        // For join entities in a one-to-many relationship, we need to swap the direction
        // to ensure the cardinality is correctly represented in the UI
        if (relationshipType === 'one-to-many') {
          // Always swap for join entities to correct the cardinality display
          [sourceEntityId, targetEntityId] = [targetEntityId, sourceEntityId];
          [sourceAttributeId, targetAttributeId] = [targetAttributeId, sourceAttributeId];
          
          // Also update the relationship name to reflect the correct direction
          if (relationship.name) {
            const parts = relationship.name.split(' to ');
            if (parts.length === 2) {
              relationship.name = `${parts[1]} to ${parts[0]}`;
            }
          }
        }
      }
      
      const { error: relationshipError } = await adminClient
        .from('relationships')
        .insert({
          id: relationship.id,
          data_model_id: relationship.data_model_id,
          source_entity_id: sourceEntityId,
          target_entity_id: targetEntityId,
          source_attribute_id: sourceAttributeId,
          target_attribute_id: targetAttributeId,
          relationship_type: relationshipType as 'one-to-one' | 'one-to-many' | 'many-to-many',
          name: relationship.name,
          created_at: relationship.created_at,
          updated_at: relationship.updated_at
        });
      
      if (relationshipError) {
        console.error('Error inserting relationship:', relationshipError);
        // We don't clean up here since the model is still usable without relationships
      }
    }
    
    console.log(`Successfully imported data model: ${modelName} with ID: ${dataModel.id}`);
    
    return NextResponse.json({
      success: true,
      dataModel: insertedDataModel,
      entityCount: entities.length,
      attributeCount: attributes.length,
      relationshipCount: relationships.length
    });
    
  } catch (error) {
    console.error('Error in POST /api/data-models/import:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
