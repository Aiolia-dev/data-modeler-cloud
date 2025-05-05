import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: { id: string; modelId: string } }
) {
  try {
    const { id: projectId, modelId } = params;
    
    console.log(`Fetching all attributes for data model: ${modelId}`);
    
    // Create admin client to bypass RLS
    const adminClient = createAdminClient();
    
    // First, get all entities in this data model
    const { data: entities, error: entityError } = await adminClient
      .from('entities')
      .select('id')
      .eq('data_model_id', modelId);
    
    if (entityError) {
      console.error('Error fetching entities:', entityError);
      return NextResponse.json(
        { error: `Failed to fetch entities: ${entityError.message}` },
        { status: 500 }
      );
    }
    
    if (!entities || entities.length === 0) {
      console.log(`No entities found for data model ${modelId}`);
      return NextResponse.json({ attributes: [] });
    }
    
    // Get entity IDs
    const entityIds = entities.map(entity => entity.id);
    
    // Fetch all attributes for these entities
    const { data: attributes, error: attributeError } = await adminClient
      .from('attributes')
      .select('*')
      .in('entity_id', entityIds)
      .order('entity_id')
      .order('is_primary_key', { ascending: false })
      .order('name');
    
    if (attributeError) {
      console.error('Error fetching attributes:', attributeError);
      return NextResponse.json(
        { error: `Failed to fetch attributes: ${attributeError.message}` },
        { status: 500 }
      );
    }
    
    console.log(`Successfully fetched ${attributes?.length || 0} attributes for data model ${modelId}`);
    return NextResponse.json({ attributes: attributes || [] });
    
  } catch (error) {
    console.error('Error in GET /api/projects/[id]/models/[modelId]/attributes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
