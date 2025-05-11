import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/models/[modelId]/all-attributes
 * 
 * Batch endpoint to fetch all attributes for all entities in a data model in a single call
 * This significantly reduces the number of API calls needed when loading a data model page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { modelId: string } }
) {
  console.log(`GET /api/models/${params.modelId}/all-attributes - Fetching all attributes for data model`);
  
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
    
    // First, get all entities for this data model
    const { data: entities, error: entitiesError } = await adminClient
      .from('entities')
      .select('id, name')
      .eq('data_model_id', modelId);
    
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
        entityAttributes: {},
        attributesByEntityId: {}
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
    
    // Create a more friendly structure that includes entity names
    const entityAttributes: Record<string, { entity: any, attributes: any[] }> = {};
    
    entities.forEach(entity => {
      entityAttributes[entity.id] = {
        entity,
        attributes: attributesByEntityId[entity.id] || []
      };
    });
    
    console.log(`Successfully fetched ${attributes?.length || 0} attributes for ${entities.length} entities`);
    
    // Return both formats for flexibility
    return NextResponse.json({
      entityAttributes,
      attributesByEntityId
    });
    
  } catch (error) {
    console.error('Error in GET /api/models/[modelId]/all-attributes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
