import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/models/[modelId]/all-data
 * 
 * Comprehensive batch endpoint to fetch all data needed for a data model in a single call:
 * - Entities
 * - Attributes
 * - Rules
 * - Relationships
 * - Referentials
 * 
 * This significantly reduces the number of API calls from 100+ to just 1
 * when loading a data model page
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const { modelId } = await params;
  console.log(`GET /api/models/${modelId}/all-data - Fetching all data for model`);
  
  try {
    // Model ID is already extracted from params
    
    if (!modelId) {
      console.error('Model ID is required');
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }
    
    // Create admin client to bypass RLS
    const adminClient = createAdminClient();
    
    // Get the data model details
    const { data: dataModel, error: dataModelError } = await adminClient
      .from('data_models')
      .select('*')
      .eq('id', modelId)
      .single();
    
    if (dataModelError) {
      console.error('Error fetching data model:', dataModelError);
      return NextResponse.json(
        { error: `Failed to fetch data model: ${dataModelError.message}` },
        { status: 500 }
      );
    }
    
    if (!dataModel) {
      console.error(`Data model ${modelId} not found`);
      return NextResponse.json(
        { error: 'Data model not found' },
        { status: 404 }
      );
    }
    
    console.log(`Fetching all data for model: ${dataModel.name}`);
    
    // Fetch all entities for this data model
    const { data: entities, error: entitiesError } = await adminClient
      .from('entities')
      .select('*')
      .eq('data_model_id', modelId)
      .order('name');
    
    if (entitiesError) {
      console.error('Error fetching entities:', entitiesError);
      return NextResponse.json(
        { error: `Failed to fetch entities: ${entitiesError.message}` },
        { status: 500 }
      );
    }
    
    if (!entities || entities.length === 0) {
      console.log(`No entities found for data model ${modelId}`);
      return NextResponse.json({
        dataModel,
        entities: [],
        attributes: [],
        rules: [],
        relationships: []
      });
    }
    
    console.log(`Found ${entities.length} entities for data model ${modelId}`);
    
    // Get all attributes for all entities in this model in a single query
    const { data: attributes, error: attributesError } = await adminClient
      .from('attributes')
      .select('*')
      .in('entity_id', entities.map(entity => entity.id))
      .order('is_primary_key', { ascending: false })
      .order('name');
    
    if (attributesError) {
      console.error('Error fetching attributes:', attributesError);
      return NextResponse.json(
        { error: `Failed to fetch attributes: ${attributesError.message}` },
        { status: 500 }
      );
    }
    
    console.log(`Found ${attributes?.length || 0} attributes for data model ${modelId}`);
    
    // Get all rules for this data model
    const { data: rules, error: rulesError } = await adminClient
      .from('rules')
      .select('*')
      .eq('data_model_id', modelId)
      .order('created_at', { ascending: false });
    
    if (rulesError) {
      console.error('Error fetching rules:', rulesError);
      return NextResponse.json(
        { error: `Failed to fetch rules: ${rulesError.message}` },
        { status: 500 }
      );
    }
    
    console.log(`Found ${rules?.length || 0} rules for data model ${modelId}`);
    
    // Get all relationships for this data model
    const { data: relationships, error: relationshipsError } = await adminClient
      .from('relationships')
      .select('*')
      .eq('data_model_id', modelId);
    
    if (relationshipsError) {
      console.error('Error fetching relationships:', relationshipsError);
      return NextResponse.json(
        { error: `Failed to fetch relationships: ${relationshipsError.message}` },
        { status: 500 }
      );
    }
    
    console.log(`Found ${relationships?.length || 0} relationships for data model ${modelId}`);
    
    // Organize data for easier consumption by the client
    
    // Organize attributes by entity
    const attributesByEntityId: Record<string, any[]> = {};
    
    // Initialize with empty arrays for all entities
    entities.forEach(entity => {
      attributesByEntityId[entity.id] = [];
    });
    
    // Populate with attributes
    attributes?.forEach(attribute => {
      if (attribute.entity_id) {
        if (!attributesByEntityId[attribute.entity_id]) {
          attributesByEntityId[attribute.entity_id] = [];
        }
        attributesByEntityId[attribute.entity_id].push(attribute);
      }
    });
    
    // Organize rules by entity and attribute
    const rulesByEntityId: Record<string, any[]> = {};
    const rulesByAttributeId: Record<string, any[]> = {};
    const modelLevelRules: any[] = [];
    
    // Initialize with empty arrays
    entities.forEach(entity => {
      rulesByEntityId[entity.id] = [];
    });
    
    attributes?.forEach(attribute => {
      rulesByAttributeId[attribute.id] = [];
    });
    
    // Populate with rules
    rules?.forEach(rule => {
      if (rule.entity_id) {
        if (!rulesByEntityId[rule.entity_id]) {
          rulesByEntityId[rule.entity_id] = [];
        }
        rulesByEntityId[rule.entity_id].push(rule);
      } else if (rule.attribute_id) {
        if (!rulesByAttributeId[rule.attribute_id]) {
          rulesByAttributeId[rule.attribute_id] = [];
        }
        rulesByAttributeId[rule.attribute_id].push(rule);
      } else {
        // Model level rules
        modelLevelRules.push(rule);
      }
    });
    
    // Organize relationships by source and target entities
    const relationshipsBySourceEntityId: Record<string, any[]> = {};
    const relationshipsByTargetEntityId: Record<string, any[]> = {};
    
    // Initialize with empty arrays
    entities.forEach(entity => {
      relationshipsBySourceEntityId[entity.id] = [];
      relationshipsByTargetEntityId[entity.id] = [];
    });
    
    // Populate with relationships
    relationships?.forEach(relationship => {
      if (relationship.source_entity_id) {
        if (!relationshipsBySourceEntityId[relationship.source_entity_id]) {
          relationshipsBySourceEntityId[relationship.source_entity_id] = [];
        }
        relationshipsBySourceEntityId[relationship.source_entity_id].push(relationship);
      }
      
      if (relationship.target_entity_id) {
        if (!relationshipsByTargetEntityId[relationship.target_entity_id]) {
          relationshipsByTargetEntityId[relationship.target_entity_id] = [];
        }
        relationshipsByTargetEntityId[relationship.target_entity_id].push(relationship);
      }
    });
    
    // Create maps for easier lookups
    const entityMap: Record<string, any> = {};
    entities.forEach(entity => {
      entityMap[entity.id] = entity;
    });
    
    const attributeMap: Record<string, any> = {};
    attributes?.forEach(attribute => {
      attributeMap[attribute.id] = attribute;
    });
    
    console.log(`Successfully organized all data for model ${modelId}`);
    
    // Return all data in a comprehensive structure
    return NextResponse.json({
      dataModel,
      entities,
      attributes: attributes || [],
      rules: rules || [],
      relationships: relationships || [],
      // Organized data
      attributesByEntityId,
      rulesByEntityId,
      rulesByAttributeId,
      modelLevelRules,
      relationshipsBySourceEntityId,
      relationshipsByTargetEntityId,
      // Maps for lookups
      entityMap,
      attributeMap
    });
    
  } catch (error) {
    console.error('Error in GET /api/models/[modelId]/all-data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
