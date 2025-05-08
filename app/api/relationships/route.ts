import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

interface Attribute {
  id: string;
  name: string;
  data_type: string;
  is_required: boolean;
  is_foreign_key: boolean;
  referenced_entity_id: string | null;
  entity_id: string;
  entities: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface Entity {
  id: string;
  name: string;
  description: string | null;
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, sourceCardinality, targetCardinality } = body;

    if (!id) {
      return NextResponse.json({ error: 'Relationship ID is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('relationships')
      .update({
        source_cardinality: sourceCardinality,
        target_cardinality: targetCardinality,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  console.log('GET /api/relationships - Fetching relationships');
  try {
    const url = new URL(request.url);
    const entityId = url.searchParams.get('entityId');
    const dataModelId = url.searchParams.get('dataModelId');
    const countOnly = url.searchParams.get('count') === 'true';

    if (!entityId && !dataModelId) {
      return NextResponse.json(
        { error: 'Either Entity ID or Data Model ID is required as a query parameter' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    
    // If count only, use a simpler query
    if (countOnly) {
      let countQuery = adminClient
        .from('relationships')
        .select('id', { count: 'exact' });

      if (entityId) {
        countQuery = countQuery.or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`);
      }
      if (dataModelId) {
        countQuery = countQuery.eq('data_model_id', dataModelId);
      }

      const { data, error, count: relationshipCount } = await countQuery;
      
      if (error) {
        console.error('Error counting relationships:', error);
        return NextResponse.json(
          { error: `Failed to count relationships: ${error.message}` },
          { status: 500 }
        );
      }
      
      // Get the count from the data array length since we're selecting only IDs
      const count = data?.length || 0;
      console.log(`Successfully counted ${count} relationships for entity ${entityId || 'in model ' + dataModelId}`);
      return NextResponse.json({ count });
    }
    
    // Full data query
    let query = adminClient
      .from('relationships')
      .select(`
        id,
        name,
        source_entity_id,
        target_entity_id,
        source_cardinality,
        target_cardinality,
        relationship_type,
        data_model_id,
        source:source_entity_id (id, name),
        target:target_entity_id (id, name)
      `);

    if (entityId) {
      query = query.or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`);
    }
    if (dataModelId) {
      query = query.eq('data_model_id', dataModelId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching relationships:', error);
      return NextResponse.json(
        { error: `Failed to fetch relationships: ${error.message}` },
        { status: 500 }
      );
    }

    const relationships = (data || []).map((rel: any) => ({
      id: rel.id,
      name: rel.name,
      sourceEntityId: rel.source_entity_id,
      sourceEntityName: rel.source?.name || 'Unknown',
      targetEntityId: rel.target_entity_id,
      targetEntityName: rel.target?.name || 'Unknown',
      sourceCardinality: rel.source_cardinality,
      targetCardinality: rel.target_cardinality,
      relationshipType: rel.relationship_type,
      dataModelId: rel.data_model_id,
    }));
    console.log(`Successfully fetched ${relationships.length} relationships`);
    return NextResponse.json({ relationships });
  } catch (error) {
    console.error('Error in GET /api/relationships:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

