import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getProjectRole, isMethodAllowedForRole } from '@/middleware/role-check';

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
  console.log('POST /api/entities - Creating a new entity');
  
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
    
    // Extract fields from the request body
    const { 
      name, 
      description, 
      data_model_id, // Changed from dataModelId to match client-side naming
      entity_type,
      join_entities,
      referential_id // Added for referential categorization
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
    
    try {
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
      
      // Create the entity using the admin client to bypass RLS
      const adminClient = createAdminClient();
      
      // First verify the data model exists
      const { data: dataModel, error: dataModelError } = await adminClient
        .from('data_models')
        .select('id, project_id')
        .eq('id', data_model_id)
        .single();
        
      if (dataModelError) {
        console.error('Error verifying data model:', dataModelError);
        return NextResponse.json(
          { error: 'Data model not found', details: dataModelError.message },
          { status: 404 }
        );
      }
      
      // Check user's role for this project
      const projectId = dataModel.project_id;
      console.log(`Checking user role for project ${projectId}`);
      
      const { role, error: roleError } = await getProjectRole(projectId);
      
      if (roleError) {
        console.error('Role check error:', roleError);
        return NextResponse.json(
          { error: 'Permission error', details: roleError },
          { status: 403 }
        );
      }
      
      // Check if the user's role allows POST requests
      if (!isMethodAllowedForRole('POST', role)) {
        console.error(`User with role ${role} not allowed to create entities`);
        return NextResponse.json(
          { error: 'Insufficient permissions to create entities' },
          { status: 403 }
        );
      }
      
      // Prepare entity data according to schema
      const entityData = {
        name,
        description: description || null,
        data_model_id: data_model_id,
        position_x: typeof body.position_x === 'number' ? body.position_x : 0,
        position_y: typeof body.position_y === 'number' ? body.position_y : 0,
        // Add the new fields
        entity_type: entity_type || 'standard',
        join_entities: join_entities || []
      };
      
      console.log('Creating entity with data:', entityData);
      
      // Create the entity
      const { data: entity, error: entityError } = await adminClient
        .from('entities')
        .insert({
          name,
          description,
          data_model_id,
          entity_type: entity_type || 'standard',
          referential_id: referential_id || null, // Add referential_id field
        })
        .select()
        .single();
      
      if (entityError) {
        console.error('Error creating entity:', entityError);
        throw new Error(`Failed to create entity: ${entityError.message}`);
      }
      
      console.log('Entity created successfully:', entity);

      // --- JOIN ENTITY RELATIONSHIP LOGIC ---
      // Use the request body for join entity logic (to avoid type errors from entity type)
      if (body.entity_type === 'join' && Array.isArray(body.join_entities) && body.join_entities.length >= 2) {
        // Fetch positions of joined entities
        const { data: joinedEntities, error: joinedEntitiesError } = await adminClient
          .from('entities')
          .select('id, position_x, position_y')
          .in('id', body.join_entities);

        if (joinedEntitiesError) {
          console.error('Error fetching joined entities for join entity:', joinedEntitiesError);
        } else if (joinedEntities.length >= 2) {
          // Calculate barycenter (average position)
          const avg = joinedEntities.reduce((acc, e) => {
            acc.x += typeof e.position_x === 'number' ? e.position_x : 0;
            acc.y += typeof e.position_y === 'number' ? e.position_y : 0;
            return acc;
          }, { x: 0, y: 0 });
          avg.x /= joinedEntities.length;
          avg.y /= joinedEntities.length;

          // Update join entity position
          const { error: updateJoinEntityError } = await adminClient
            .from('entities')
            .update({ position_x: avg.x, position_y: avg.y })
            .eq('id', entity.id);
          if (updateJoinEntityError) {
            console.error('Failed to update join entity position:', updateJoinEntityError);
          } else {
            entity.position_x = avg.x;
            entity.position_y = avg.y;
          }
        }

        // Fetch joined entities' names for relationship naming
        let joinedEntitiesNamesMap: Record<string, string> = {};
        {
          const { data: joinedEntitiesMeta, error: joinedEntitiesMetaError } = await adminClient
            .from('entities')
            .select('id, name')
            .in('id', body.join_entities);
          if (!joinedEntitiesMetaError && Array.isArray(joinedEntitiesMeta)) {
            for (const ent of joinedEntitiesMeta) {
              joinedEntitiesNamesMap[ent.id] = ent.name;
            }
          }
        }
        // Insert relationships for each joined entity
        for (const targetEntityIdRaw of body.join_entities) {
          const targetEntityId = String(targetEntityIdRaw);
          const targetEntityName = joinedEntitiesNamesMap[targetEntityId] || targetEntityId;
          const relationshipData: {
            data_model_id: string;
            source_entity_id: string;
            target_entity_id: string;
            relationship_type: 'one-to-one' | 'one-to-many' | 'many-to-many';
            source_cardinality: string;
            target_cardinality: string;
            name: string;
          } = {
            data_model_id: entity.data_model_id,
            source_entity_id: entity.id,
            target_entity_id: targetEntityId,
            relationship_type: 'one-to-many',
            source_cardinality: '0..n',
            target_cardinality: '0..1',
            name: `${entity.name} to ${targetEntityName}`
          };
          const { error: relError } = await adminClient
            .from('relationships')
            .insert(relationshipData);
          if (relError) {
            console.error('Failed to insert relationship for join entity:', relError);
          }
        }
      }
      
      // Create primary key attribute based on the provided data
      // Extract primary key information from the request body
      const primaryKeyType = body.primaryKeyType || 'uuid';
      const primaryKeyName = body.primaryKeyName || 'id';
      
      // Determine the data type based on the primary key type
      let dataType = 'uuid';
      if (primaryKeyType === 'auto_increment') {
        dataType = 'integer';
      } else if (primaryKeyType === 'custom') {
        dataType = 'varchar';
      } else if (primaryKeyType === 'composite') {
        dataType = 'composite';
      }
      
      const attributeData = {
        name: primaryKeyName,
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
      if (body.entity_type === 'join' && Array.isArray(body.join_entities) && body.join_entities.length >= 2) {
        // Fetch joined entities' names and PK types
        const { data: joinedEntitiesMeta, error: joinedEntitiesMetaError } = await adminClient
          .from('entities')
          .select('id, name')
          .in('id', body.join_entities);
        if (joinedEntitiesMetaError) {
          console.error('Error fetching joined entities meta for FK attributes:', joinedEntitiesMetaError);
        } else {
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
            const fkAttrName = `id${targetEntity.name.replace(/\s+/g, '')}`;
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
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: dbError instanceof Error ? dbError.message : 'Database operation failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/entities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
