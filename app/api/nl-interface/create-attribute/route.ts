import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: NextRequest) {
  console.log('POST /api/nl-interface/create-attribute - Processing attribute creation from NL request');
  
  try {
    // Get request body
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
      attributeName,
      entityName,
      dataType = 'text',
      description = null,
      isRequired = false,
      isUnique = false,
      isPrimaryKey = false,
      isForeignKey = false,
      defaultValue = null,
      length = null,
      modelId
    } = body;
    
    // Validate required fields
    if (!attributeName) {
      return NextResponse.json(
        { error: 'Attribute name is required' },
        { status: 400 }
      );
    }
    
    if (!entityName) {
      return NextResponse.json(
        { error: 'Entity name is required' },
        { status: 400 }
      );
    }
    
    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }
    
    // Get the current user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        { error: 'Authentication error', details: userError?.message },
        { status: 401 }
      );
    }
    
    console.log('User authenticated:', user.id);
    
    // Create the admin client to bypass RLS
    const adminClient = createAdminClient();
    
    // First, find the entity by name within the specified model
    console.log(`Looking up entity with name "${entityName}" in model ${modelId}`);
    const { data: entities, error: entityError } = await adminClient
      .from('entities')
      .select('id, name')
      .eq('name', entityName)
      .eq('data_model_id', modelId);
      
    if (entityError) {
      console.error('Error finding entity:', entityError);
      return NextResponse.json(
        { error: 'Failed to find entity', details: entityError.message },
        { status: 500 }
      );
    }
    
    if (!entities || entities.length === 0) {
      console.error(`Entity "${entityName}" not found in model ${modelId}`);
      return NextResponse.json(
        { error: `Entity "${entityName}" not found` },
        { status: 404 }
      );
    }
    
    // Use the first matching entity (should be only one with that name in the model)
    const entityId = entities[0].id;
    console.log(`Found entity "${entityName}" with ID ${entityId}`);
    
    // Check if an attribute with this name already exists for this entity
    const { data: existingAttributes, error: existingAttrError } = await adminClient
      .from('attributes')
      .select('id, name')
      .eq('entity_id', entityId)
      .eq('name', attributeName);
      
    if (existingAttrError) {
      console.error('Error checking existing attributes:', existingAttrError);
      return NextResponse.json(
        { error: 'Failed to check existing attributes', details: existingAttrError.message },
        { status: 500 }
      );
    }
    
    if (existingAttributes && existingAttributes.length > 0) {
      console.error(`Attribute "${attributeName}" already exists for entity "${entityName}"`);
      return NextResponse.json(
        { error: `Attribute "${attributeName}" already exists for entity "${entityName}"` },
        { status: 409 }
      );
    }
    
    // Prepare attribute data according to schema
    const attributeData = {
      name: attributeName,
      description: description,
      data_type: dataType,
      entity_id: entityId,
      is_required: isRequired,
      is_unique: isUnique,
      is_primary_key: isPrimaryKey,
      is_foreign_key: isForeignKey,
      default_value: defaultValue,
      length: length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
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

    console.log('Attribute created successfully:', attribute);
    return NextResponse.json({ 
      success: true,
      attribute,
      message: `Successfully created attribute "${attributeName}" of type ${dataType} for entity "${entityName}"`
    });
    
  } catch (error) {
    console.error('Error in POST /api/nl-interface/create-attribute:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
