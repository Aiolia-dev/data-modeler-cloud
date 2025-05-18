import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * API endpoint to get entity names by their IDs
 * This is used to display proper entity names in foreign key references
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const entityIds = url.searchParams.get('ids');
    
    if (!entityIds) {
      return NextResponse.json(
        { error: 'Entity IDs are required as a query parameter' },
        { status: 400 }
      );
    }
    
    // Parse the comma-separated list of entity IDs
    const ids = entityIds.split(',').filter(id => id.trim() !== '');
    
    if (ids.length === 0) {
      return NextResponse.json({ entityNames: {} });
    }
    
    const adminClient = createAdminClient();
    
    // Fetch entity names for the provided IDs
    const { data, error } = await adminClient
      .from('entities')
      .select('id, name')
      .in('id', ids);
    
    if (error) {
      console.error('Error fetching entity names:', error);
      return NextResponse.json(
        { error: `Failed to fetch entity names: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Create a mapping of entity IDs to entity names
    const entityNames: Record<string, string> = {};
    data?.forEach(entity => {
      entityNames[entity.id] = entity.name;
    });
    
    return NextResponse.json({ entityNames });
  } catch (error: any) {
    console.error('Error in GET /api/entity-names:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
