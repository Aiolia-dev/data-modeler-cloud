import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * API endpoint to get the count of entities that reference a specific attribute
 * This is used to populate the "Referenced By" count in the attribute tooltip
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const attributeId = url.searchParams.get('attributeId');
    const entityId = url.searchParams.get('entityId');
    
    if (!attributeId && !entityId) {
      return NextResponse.json(
        { error: 'Either attributeId or entityId is required as a query parameter' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    
    // If we have an entityId, get all attributes for that entity
    if (entityId) {
      // First, get all attributes for this entity
      const { data: attributes, error: attributesError } = await adminClient
        .from('attributes')
        .select('id, name, is_primary_key')
        .eq('entity_id', entityId);
      
      if (attributesError) {
        return NextResponse.json(
          { error: `Failed to fetch attributes: ${attributesError.message}` },
          { status: 500 }
        );
      }
      
      // For each attribute (especially primary keys), count references
      const referenceCounts: Record<string, number> = {};
      
      // We're only interested in primary keys, as they are the ones that can be referenced
      const primaryKeyAttributes = attributes?.filter(attr => attr.is_primary_key) || [];
      
      for (const attribute of primaryKeyAttributes) {
        // Find all foreign keys that reference this attribute
        const { data: references, error: referencesError } = await adminClient
          .from('attributes')
          .select('id, entity_id')
          .eq('is_foreign_key', true)
          .eq('referenced_attribute_id', attribute.id);
        
        if (referencesError) {
          console.error(`Error fetching references for attribute ${attribute.id}:`, referencesError);
          // Continue with other attributes even if one fails
          referenceCounts[attribute.id] = 0;
          continue;
        }
        
        // Count unique entities that reference this attribute
        const uniqueEntityIds = new Set(references?.map(ref => ref.entity_id) || []);
        referenceCounts[attribute.id] = uniqueEntityIds.size;
      }
      
      return NextResponse.json({ referenceCounts });
    }
    
    // If we have a specific attributeId, just get references for that attribute
    if (attributeId) {
      // First check if this is a primary key (only primary keys can be referenced)
      const { data: attribute, error: attributeError } = await adminClient
        .from('attributes')
        .select('is_primary_key')
        .eq('id', attributeId)
        .single();
      
      if (attributeError) {
        return NextResponse.json(
          { error: `Failed to fetch attribute: ${attributeError.message}` },
          { status: 500 }
        );
      }
      
      // If it's not a primary key, it can't be referenced
      if (!attribute?.is_primary_key) {
        return NextResponse.json({ referenceCount: 0 });
      }
      
      // Find all foreign keys that reference this attribute
      const { data: references, error: referencesError } = await adminClient
        .from('attributes')
        .select('id, entity_id')
        .eq('is_foreign_key', true)
        .eq('referenced_attribute_id', attributeId);
      
      if (referencesError) {
        return NextResponse.json(
          { error: `Failed to fetch references: ${referencesError.message}` },
          { status: 500 }
        );
      }
      
      // Count unique entities that reference this attribute
      const uniqueEntityIds = new Set(references?.map(ref => ref.entity_id) || []);
      const referenceCount = uniqueEntityIds.size;
      
      return NextResponse.json({ referenceCount });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in GET /api/attribute-references:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
