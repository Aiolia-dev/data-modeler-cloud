import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: NextRequest) {
  console.log('POST /api/nl-interface/create-join-entity - Processing join entity creation from NL request');
  
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
      entityName,
      sourceEntityName,
      targetEntityName,
      description = null,
      modelId
    } = body;
    
    // Validate required fields
    if (!entityName) {
      return NextResponse.json(
        { error: 'Join entity name is required' },
        { status: 400 }
      );
    }
    
    if (!sourceEntityName || !targetEntityName) {
      return NextResponse.json(
        { error: 'Source and target entity names are required' },
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
    
    // Find the source and target entities by name within the specified model (case-insensitive)
    console.log(`Looking up entities "${sourceEntityName}" and "${targetEntityName}" in model ${modelId}`);
    
    // Get all entities in the model to perform case-insensitive matching
    const { data: allEntities, error: entityError } = await adminClient
      .from('entities')
      .select('id, name')
      .eq('data_model_id', modelId);
      
    if (entityError) {
      console.error('Error finding entities:', entityError);
      return NextResponse.json(
        { error: 'Failed to find entities', details: entityError.message },
        { status: 500 }
      );
    }
    
    if (!allEntities || allEntities.length === 0) {
      console.error(`No entities found in model ${modelId}`);
      return NextResponse.json(
        { error: `No entities found in the data model` },
        { status: 404 }
      );
    }
    
    // Perform case-insensitive matching for the source and target entities
    const sourceEntity = allEntities.find(e => 
      e.name.toLowerCase() === sourceEntityName.toLowerCase() ||
      e.name.toLowerCase() === sourceEntityName.toLowerCase().replace(/["']/g, '')
    );
    
    const targetEntity = allEntities.find(e => 
      e.name.toLowerCase() === targetEntityName.toLowerCase() ||
      e.name.toLowerCase() === targetEntityName.toLowerCase().replace(/["']/g, '')
    );
    
    // Log the search results
    console.log('Source entity search result:', sourceEntity);
    console.log('Target entity search result:', targetEntity);
    
    if (!sourceEntity || !targetEntity) {
      console.error(`One or both entities "${sourceEntityName}" and "${targetEntityName}" not found in model ${modelId}`);
      return NextResponse.json(
        { error: `One or both entities "${sourceEntityName}" and "${targetEntityName}" not found. Please check entity names and try again.` },
        { status: 404 }
      );
    }
    
    console.log(`Found entities: ${sourceEntityName} (${sourceEntity.id}) and ${targetEntityName} (${targetEntity.id})`);
    
    // Check if a join entity with this name already exists in the model
    const { data: existingEntity, error: existingEntityError } = await adminClient
      .from('entities')
      .select('id, name')
      .eq('data_model_id', modelId)
      .eq('name', entityName)
      .single();
      
    if (existingEntityError && existingEntityError.code !== 'PGRST116') {  // PGRST116 is "no rows returned"
      console.error('Error checking existing entity:', existingEntityError);
      return NextResponse.json(
        { error: 'Failed to check existing entity', details: existingEntityError.message },
        { status: 500 }
      );
    }
    
    if (existingEntity) {
      console.error(`Entity "${entityName}" already exists in model ${modelId}`);
      return NextResponse.json(
        { error: `Entity "${entityName}" already exists` },
        { status: 409 }
      );
    }
    
    // Create the join entity
    const entityData = {
      name: entityName,
      description: description || `Junction table linking ${sourceEntityName}, ${targetEntityName} entities`,
      data_model_id: modelId,
      entity_type: 'join',
      join_entities: [sourceEntity.id, targetEntity.id],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Creating join entity with data:', entityData);
    
    // Insert the entity
    const { data: entity, error: entityCreateError } = await adminClient
      .from('entities')
      .insert(entityData)
      .select()
      .single();

    if (entityCreateError) {
      console.error('Error creating join entity:', entityCreateError);
      return NextResponse.json(
        { error: `Failed to create join entity: ${entityCreateError.message}` },
        { status: 500 }
      );
    }

    console.log('Join entity created successfully:', entity);
    
    // Create relationships between the join entity and the source/target entities
    const relationships = [];
    
    for (const joinedEntityId of [sourceEntity.id, targetEntity.id]) {
      const relationshipData = {
        source_entity_id: entity.id,
        target_entity_id: joinedEntityId,
        relationship_type: 'many-to-many' as 'many-to-many', // Type assertion to match the expected enum
        data_model_id: modelId
      };
      
      console.log('Creating relationship:', relationshipData);
      
      const { data: relationship, error: relError } = await adminClient
        .from('relationships')
        .insert(relationshipData)
        .select()
        .single();
        
      if (relError) {
        console.error('Failed to insert relationship for join entity:', relError);
      } else {
        relationships.push(relationship);
        console.log('Relationship created successfully:', relationship);
      }
    }
    
    // Create primary key attribute
    const pkAttributeData = {
      name: 'id',
      description: 'Primary key',
      data_type: 'uuid',
      is_required: true,
      is_unique: true,
      is_primary_key: true,
      entity_id: entity.id
    };
    
    console.log('Creating primary key attribute:', pkAttributeData);
    
    const { data: pkAttribute, error: pkAttributeError } = await adminClient
      .from('attributes')
      .insert(pkAttributeData)
      .select()
      .single();
      
    if (pkAttributeError) {
      console.error('Error creating primary key attribute:', pkAttributeError);
    } else {
      console.log('Primary key attribute created successfully:', pkAttribute);
    }
    
    // Create foreign key attributes for the source and target entities
    const foreignKeys = [];
    
    // Fetch primary key information for source and target entities
    for (const targetEntityObj of [sourceEntity, targetEntity]) {
      // Try to get PK attribute for this entity
      let fkType = 'uuid';
      let pkAttrName = 'id';
      const { data: pkAttr, error: pkAttrError } = await adminClient
        .from('attributes')
        .select('name, data_type')
        .eq('entity_id', targetEntityObj.id)
        .eq('is_primary_key', true)
        .single();
        
      if (!pkAttrError && pkAttr) {
        fkType = pkAttr.data_type;
        pkAttrName = pkAttr.name;
      }
      
      const fkAttrName = `id${targetEntityObj.name.replace(/\\s+/g, '')}`;
      const fkAttrData = {
        name: fkAttrName,
        description: `Foreign key to ${targetEntityObj.name}`,
        data_type: fkType,
        is_required: false,
        is_unique: false,
        is_primary_key: false,
        is_foreign_key: true,
        referenced_entity_id: targetEntityObj.id,
        entity_id: entity.id
      };
      
      console.log('Creating foreign key attribute:', fkAttrData);
      
      const { data: fkAttr, error: fkAttrError } = await adminClient
        .from('attributes')
        .insert(fkAttrData)
        .select()
        .single();
        
      if (fkAttrError) {
        console.error(`Error creating FK attribute ${fkAttrName}:`, fkAttrError);
      } else {
        foreignKeys.push(fkAttr);
        console.log(`Foreign key attribute ${fkAttrName} created successfully:`, fkAttr);
      }
    }

    return NextResponse.json({ 
      success: true,
      entity,
      relationships,
      primaryKey: pkAttribute,
      foreignKeys,
      message: `Successfully created join entity "${entityName}" between "${sourceEntityName}" and "${targetEntityName}"`
    });
    
  } catch (error) {
    console.error('Error in POST /api/nl-interface/create-join-entity:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
