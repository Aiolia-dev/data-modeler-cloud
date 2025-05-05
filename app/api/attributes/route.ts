import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  console.log('GET /api/attributes - Fetching attributes');
  
  try {
    // Parse the URL to get query parameters
    const url = new URL(request.url);
    const entityId = url.searchParams.get('entityId');
    const countOnly = url.searchParams.get('count') === 'true';
    const foreignKeyOnly = url.searchParams.get('foreignKeyOnly') === 'true';
    
    if (!entityId) {
      console.error('Entity ID is required');
      return NextResponse.json(
        { error: 'Entity ID is required as a query parameter' },
        { status: 400 }
      );
    }
    
    console.log('Fetching attributes for entity:', entityId, 'countOnly:', countOnly, 'foreignKeyOnly:', foreignKeyOnly);
    
    // Create admin client to bypass RLS
    const adminClient = createAdminClient();
    
    // Build the query
    let query = adminClient.from('attributes').select(countOnly ? 'id' : '*').eq('entity_id', entityId);
    
    // Add foreign key filter if requested
    if (foreignKeyOnly) {
      query = query.eq('is_foreign_key', true);
    }
    
    // If count only, get the count
    if (countOnly) {
      const { data, error, count } = await query.count('exact');
      
      if (error) {
        console.error('Error counting attributes:', error);
        return NextResponse.json(
          { error: `Failed to count attributes: ${error.message}` },
          { status: 500 }
        );
      }
      
      console.log(`Successfully counted ${count} attributes for entity ${entityId}`);
      return NextResponse.json({ count: count || 0 });
    } else {
      // Otherwise get the full data
      const { data: attributes, error } = await query
        .order('is_primary_key', { ascending: false })
        .order('name');
      
      if (error) {
        console.error('Error fetching attributes:', error);
        return NextResponse.json(
          { error: `Failed to fetch attributes: ${error.message}` },
          { status: 500 }
        );
      }
      
      console.log(`Successfully fetched ${attributes.length} attributes for entity ${entityId}`);
      return NextResponse.json({ attributes });
    }
    
  } catch (error) {
    console.error('Error in GET /api/attributes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log('POST /api/attributes - Creating a new attribute');
  
  try {
    // Get request body first to avoid any auth issues if the body is invalid
    let body;
    try {
      body = await request.json();
      console.log('Request body:', body);
    } catch (jsonError) {
      console.error('Error parsing request body:', jsonError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { 
      name, 
      description, 
      dataType, 
      entityId,
      isRequired = false,
      isUnique = false,
      isPrimaryKey = false,
      isForeignKey = false,
      defaultValue = null,
      length = null,
      precision = null,
      scale = null,
      referencedEntityId = null,
      referencedAttributeId = null,
      onDeleteAction = null,
      onUpdateAction = null
    } = body;
    
    if (!name) {
      console.error('Attribute name is required');
      return NextResponse.json(
        { error: 'Attribute name is required' },
        { status: 400 }
      );
    }
    
    if (!dataType) {
      console.error('Data type is required');
      return NextResponse.json(
        { error: 'Data type is required' },
        { status: 400 }
      );
    }
    
    if (!entityId) {
      console.error('Entity ID is required');
      return NextResponse.json(
        { error: 'Entity ID is required' },
        { status: 400 }
      );
    }
    
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
    
    console.log('User authenticated:', user.id);
    
    // Create the attribute using the admin client to bypass RLS
    const adminClient = createAdminClient();
    
    // First verify the entity exists
    const { data: entity, error: entityError } = await adminClient
      .from('entities')
      .select('id')
      .eq('id', entityId)
      .single();
      
    if (entityError) {
      console.error('Error verifying entity:', entityError);
      return NextResponse.json(
        { error: 'Entity not found', details: entityError.message },
        { status: 404 }
      );
    }
    
    // Prepare attribute data according to schema - only include fields that exist in the database
    const attributeData = {
      name,
      description: description || null,
      data_type: dataType,
      entity_id: entityId,
      is_required: isRequired,
      is_unique: isUnique,
      is_primary_key: isPrimaryKey,
      is_foreign_key: isForeignKey,
      default_value: defaultValue,
      length,
      referenced_entity_id: referencedEntityId || null,
      // Add timestamps for created_at and updated_at
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Note: The following fields are not included because they don't exist in your schema:
    // - precision
    // - scale
    // - referenced_entity_id
    // - referenced_attribute_id
    // - on_delete_action
    // - on_update_action
    
    console.log('Creating attribute with data:', attributeData);
    
    // Insert the attribute
    const { data: attribute, error: attributeError } = await adminClient
      .from('attributes')
      .insert(attributeData)
      .select()
      .single();

    if (attributeError) {
      console.error('Error creating attribute:', attributeError);
      return NextResponse.json(
        { error: `Failed to create attribute: ${attributeError.message}` },
        { status: 500 }
      );
    }

    // If this is a foreign key, also create a relationship row
    if (isForeignKey && referencedEntityId) {
      // Fetch the referenced entity to get its data_model_id
      const { data: targetEntity, error: targetEntityError } = await adminClient
        .from('entities')
        .select('id, data_model_id')
        .eq('id', referencedEntityId)
        .single();
      if (!targetEntityError && targetEntity) {
        const relationshipData = {
          data_model_id: targetEntity.data_model_id,
          source_entity_id: entityId,
          target_entity_id: referencedEntityId,
          name: name,
          relationship_type: 'one-to-many', // Default, can be customized later
          source_attribute_id: attribute.id,
        };
        const { error: relError } = await adminClient
          .from('relationships')
          .insert(relationshipData);
        if (relError) {
          console.error('Failed to create relationship for foreign key:', relError);
        }
      } else {
        console.error('Could not fetch referenced entity for relationship creation:', targetEntityError);
      }
    }

    console.log('Attribute created successfully:', attribute);
    return NextResponse.json({ attribute });
    
  } catch (error) {
    console.error('Error in POST /api/attributes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
