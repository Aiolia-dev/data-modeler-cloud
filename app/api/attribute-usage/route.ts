import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * API endpoint to find all entities that have an attribute with the same name
 * This is used to show all entities that reference a particular attribute in the tooltip
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const attributeName = url.searchParams.get('name');
    const dataModelId = url.searchParams.get('dataModelId');
    
    if (!attributeName || !dataModelId) {
      return NextResponse.json(
        { error: 'Attribute name and data model ID are required as query parameters' },
        { status: 400 }
      );
    }
    
    const adminClient = createAdminClient();
    
    // Find all attributes with the same name in the data model
    const { data: attributes, error } = await adminClient
      .from('attributes')
      .select(`
        id,
        name,
        is_foreign_key,
        entity_id,
        entities (
          id,
          name
        )
      `)
      .eq('name', attributeName)
      .eq('data_model_id', dataModelId);
    
    if (error) {
      console.error('Error fetching attributes:', error);
      return NextResponse.json(
        { error: `Failed to fetch attributes: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Extract unique entities that have this attribute
    const entitiesWithAttribute = attributes
      .filter(attr => attr.is_foreign_key)
      .map(attr => ({
        id: attr.entities.id,
        name: attr.entities.name
      }));
    
    // Remove duplicates by entity ID
    const uniqueEntities = Array.from(
      new Map(entitiesWithAttribute.map(entity => [entity.id, entity])).values()
    );
    
    return NextResponse.json({ 
      entities: uniqueEntities,
      count: uniqueEntities.length
    });
  } catch (error: any) {
    console.error('Error in GET /api/attribute-usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
