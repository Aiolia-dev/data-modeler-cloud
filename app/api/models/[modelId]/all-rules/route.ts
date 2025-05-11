import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/models/[modelId]/all-rules
 * 
 * Batch endpoint to fetch all rules for a data model in a single call
 * This significantly reduces the number of API calls needed when loading a data model page
 */
export async function GET(
  request: NextRequest,
  context: { params: { modelId: string } }
) {
  const { params } = context;
  console.log(`GET /api/models/${params.modelId}/all-rules - Fetching all rules for data model`);
  
  try {
    // Get the model ID from the URL params
    const modelId = params.modelId;
    
    if (!modelId) {
      console.error('Model ID is required');
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }
    
    // Create admin client to bypass RLS
    const adminClient = createAdminClient();
    
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
    
    // Get all entities for this data model to organize rules by entity
    const { data: entities, error: entitiesError } = await adminClient
      .from('entities')
      .select('id, name')
      .eq('data_model_id', modelId);
    
    if (entitiesError) {
      console.error('Error fetching entities:', entitiesError);
      // Continue with just the rules data
    }
    
    // Get all attributes to organize rules by attribute
    const { data: attributes, error: attributesError } = await adminClient
      .from('attributes')
      .select('id, name, entity_id')
      .in('entity_id', entities?.map(entity => entity.id) || []);
    
    if (attributesError) {
      console.error('Error fetching attributes:', attributesError);
      // Continue with just the rules and entities data
    }
    
    // Organize rules by entity and attribute
    const rulesByEntityId: Record<string, any[]> = {};
    const rulesByAttributeId: Record<string, any[]> = {};
    const modelLevelRules: any[] = [];
    
    // Initialize with empty arrays
    entities?.forEach(entity => {
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
    
    // Create entity map for easier lookup
    const entityMap: Record<string, any> = {};
    entities?.forEach(entity => {
      entityMap[entity.id] = entity;
    });
    
    // Create attribute map for easier lookup
    const attributeMap: Record<string, any> = {};
    attributes?.forEach(attribute => {
      attributeMap[attribute.id] = attribute;
    });
    
    console.log(`Successfully organized ${rules?.length || 0} rules by entity and attribute`);
    
    return NextResponse.json({
      rules: rules || [],
      rulesByEntityId,
      rulesByAttributeId,
      modelLevelRules,
      entityMap,
      attributeMap
    });
    
  } catch (error) {
    console.error('Error in GET /api/models/[modelId]/all-rules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
