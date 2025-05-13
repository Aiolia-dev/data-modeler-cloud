import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  console.log('GET /api/entities - Fetching entities');
  
  try {
    // Get the URL parameters
    const url = new URL(request.url);
    const dataModelId = url.searchParams.get('dataModelId');
    
    if (!dataModelId) {
      console.error('Data model ID is required');
      return NextResponse.json(
        { error: 'Data model ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Fetching entities for data model: ${dataModelId}`);
    
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
    
    // Use the admin client to bypass RLS policies
    const adminClient = createAdminClient();
    
    // Fetch entities for this data model
    const { data: entities, error: entitiesError } = await adminClient
      .from('entities')
      .select('*')
      .eq('data_model_id', dataModelId)
      .order('name');
    
    if (entitiesError) {
      console.error('Error fetching entities:', entitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch entities', details: entitiesError.message },
        { status: 500 }
      );
    }
    
    console.log(`Fetched ${entities?.length || 0} entities for data model ${dataModelId}`);
    return NextResponse.json({ entities: entities || [] });
  } catch (error) {
    console.error('Error in GET /api/entities:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log('=== POST /api/entities - Creating a new entity ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    // Get request body first to avoid any auth issues if the body is invalid
    let body;
    try {
      body = await request.json();
      console.log('Request body:', JSON.stringify(body, null, 2));
    } catch (jsonError) {
      console.error('Error parsing request body:', jsonError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    // Extract fields from the request body
    const { 
      name, 
      description, 
      data_model_id, 
      entity_type,
      join_entities,
      referential_id,
      position_x,
      position_y,
      primaryKeyType,
      primaryKeyName
    } = body;
    
    if (!name) {
      console.error('Entity name is required');
      return NextResponse.json(
        { error: 'Entity name is required' },
        { status: 400 }
      );
    }
    
    if (!data_model_id) {
      console.error('Data model ID is required');
      return NextResponse.json(
        { error: 'Data model ID is required' },
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
    
    // Create the admin client early to use for all database operations
    console.log('Creating admin client...');
    const adminClient = await createAdminClient();
    console.log('Admin client created successfully');
    
    // Verify data model exists using admin client to bypass RLS
    console.log('Verifying data model exists (using admin client):', data_model_id);
    const dataModelResponse = await adminClient
      .from('data_models')
      .select('id, project_id')
      .eq('id', data_model_id)
      .single();
    
    console.log('Data model response:', JSON.stringify(dataModelResponse, null, 2));
    
    const { data: dataModel, error: dataModelError } = dataModelResponse;
      
    if (dataModelError) {
      console.error('Error verifying data model (even with admin client):', dataModelError);
      console.log('Warning: Proceeding anyway as a last resort...');
      // We'll continue anyway as a last resort
    } else {
      console.log('Data model found successfully:', dataModel);
    }
    
    // Prepare entity data
    const entityData = {
      name,
      description: description || null,
      data_model_id,
      entity_type: entity_type || 'table',
      referential_id: referential_id || null,
      position_x: typeof position_x === 'number' ? position_x : 0,
      position_y: typeof position_y === 'number' ? position_y : 0
      // Removed created_by field as it doesn't exist in the entities table schema
    };
    
    console.log('Creating entity with data:', JSON.stringify(entityData, null, 2));
    
    // Create the entity
    console.log('Executing insert operation...');
    try {
      const insertResponse = await adminClient
        .from('entities')
        .insert(entityData)
        .select()
        .single();
      
      console.log('Insert response:', JSON.stringify(insertResponse, null, 2));
      
      const { data: entity, error: entityError } = insertResponse;
      
      if (entityError) {
        console.error('Error creating entity:', entityError);
        console.error('Error details:', JSON.stringify(entityError, null, 2));
        return NextResponse.json(
          { error: 'Failed to create entity', details: entityError.message, code: entityError.code },
          { status: 500 }
        );
      }
      
      console.log('Entity created successfully:', entity);
      
      // Create relationships for join entities
      if (entity_type === 'join' && Array.isArray(join_entities) && join_entities.length >= 2) {
        console.log(`Creating relationships for join entity with ${join_entities.length} joined entities`);
        
        for (const joinedEntityId of join_entities) {
          const relationshipData = {
            entity1_id: entity.id,
            entity2_id: joinedEntityId,
            relationship_type: 'many-to-many',
            data_model_id: data_model_id
          };
          
          console.log('Creating relationship:', relationshipData);
          
          const { error: relError } = await adminClient
            .from('relationships')
            .insert(relationshipData);
          if (relError) {
            console.error('Failed to insert relationship for join entity:', relError);
          }
        }
      }
      
      // Create primary key attribute based on the provided data
      const pkType = primaryKeyType || 'uuid';
      const pkName = primaryKeyName || 'id';
      
      // Determine the data type based on the primary key type
      let dataType = 'uuid';
      if (pkType === 'auto_increment') {
        dataType = 'integer';
      } else if (pkType === 'custom') {
        dataType = 'varchar';
      } else if (pkType === 'composite') {
        dataType = 'composite';
      }
    
      const attributeData = {
        name: pkName,
        description: 'Primary key',
        data_type: dataType,
        is_required: true,
        is_unique: true,
        is_primary_key: true,
        entity_id: entity.id
      };
      
      console.log('Creating primary key attribute:', attributeData);
      
      const { error: attributeError } = await adminClient
        .from('attributes')
        .insert(attributeData);

      if (attributeError) {
        console.error('Error creating primary key attribute:', attributeError);
        // We don't fail the whole request if just the attribute creation fails
      } else {
        console.log('Primary key attribute created successfully');
      }

      // --- Create foreign key attributes for join entities ---
      if (entity_type === 'join' && Array.isArray(join_entities) && join_entities.length >= 2) {
        // Fetch joined entities' names and PK types
        const { data: joinedEntitiesMeta, error: joinedEntitiesMetaError } = await adminClient
          .from('entities')
          .select('id, name')
          .in('id', join_entities);
        if (joinedEntitiesMetaError) {
          console.error('Error fetching joined entities meta for FK attributes:', joinedEntitiesMetaError);
        } else if (joinedEntitiesMeta) {
          for (const targetEntity of joinedEntitiesMeta) {
            // Try to get PK attribute for this entity
            let fkType = 'uuid';
            let pkAttrName = 'id';
            const { data: pkAttr, error: pkAttrError } = await adminClient
              .from('attributes')
              .select('name, data_type')
              .eq('entity_id', targetEntity.id)
              .eq('is_primary_key', true)
              .single();
            if (!pkAttrError && pkAttr) {
              fkType = pkAttr.data_type;
              pkAttrName = pkAttr.name;
            }
            const fkAttrName = `id${targetEntity.name.replace(/\\s+/g, '')}`;
            const fkAttrData = {
              name: fkAttrName,
              description: `Foreign key to ${targetEntity.name}`,
              data_type: fkType,
              is_required: false,
              is_unique: false,
              is_primary_key: false,
              is_foreign_key: true,
              referenced_entity_id: targetEntity.id,
              entity_id: entity.id
            };
            const { error: fkAttrError } = await adminClient
              .from('attributes')
              .insert(fkAttrData);
            if (fkAttrError) {
              console.error(`Error creating FK attribute ${fkAttrName}:`, fkAttrError);
            } else {
              console.log(`Foreign key attribute ${fkAttrName} created successfully`);
            }
          }
        }
      }
      
      return NextResponse.json({ entity });
    } catch (insertExecutionError: any) {
      console.error('Exception during insert execution:', insertExecutionError);
      console.error('Stack trace:', insertExecutionError.stack);
      return NextResponse.json(
        { error: 'Exception during insert', details: insertExecutionError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in entities POST route:", error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Internal server error", details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
