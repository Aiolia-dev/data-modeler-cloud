import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: NextRequest) {
  console.log('POST /api/nl-interface/create-entity - Processing standard entity creation from NL request');
  
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
      entityName = 'Untitled_entity',
      description = null,
      modelId,
      positionX,
      positionY,
      referenceEntityId,
      referenceEntityName, // Added support for reference by name
      referenceEntityOffset = 250 // Default offset of 250px to the right
    } = body;
    
    // Validate required fields
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
    
    // Calculate position if reference entity is provided
    let finalPositionX = positionX;
    let finalPositionY = positionY;
    
    // First check if we have a reference entity ID
    if (referenceEntityId && (!positionX || !positionY)) {
      console.log(`Looking up reference entity by ID ${referenceEntityId} for positioning`);
      
      // Get reference entity position
      const { data: referenceEntity, error: refEntityError } = await adminClient
        .from('entities')
        .select('position_x, position_y')
        .eq('id', referenceEntityId)
        .single();
        
      if (refEntityError) {
        console.error('Error finding reference entity by ID:', refEntityError);
      } else if (referenceEntity) {
        console.log('Reference entity found by ID:', referenceEntity);
        finalPositionX = referenceEntity.position_x + referenceEntityOffset;
        finalPositionY = referenceEntity.position_y;
      }
    }
    // If no reference entity ID or it wasn't found, try using the reference entity name
    else if (referenceEntityName && (!positionX || !positionY)) {
      console.log(`Looking up reference entity by name "${referenceEntityName}" for positioning`);
      
      // Clean up the reference entity name - remove quotes, extra spaces, etc.
      const cleanReferenceEntityName = referenceEntityName.replace(/["']/g, '').trim();
      console.log(`Cleaned reference entity name: "${cleanReferenceEntityName}"`);
      
      // Get reference entity position by name (case-insensitive)
      const { data: referenceEntities, error: refEntityError } = await adminClient
        .from('entities')
        .select('id, name, position_x, position_y')
        .eq('data_model_id', modelId)
        .order('created_at', { ascending: false });
        
      if (refEntityError) {
        console.error('Error finding entities:', refEntityError);
      } else if (referenceEntities && referenceEntities.length > 0) {
        console.log(`Found ${referenceEntities.length} entities in the model:`, 
          referenceEntities.map(e => e.name).join(', '));
        
        // Try exact match first (case-insensitive)
        let referenceEntity = referenceEntities.find(
          (entity) => entity.name.toLowerCase() === cleanReferenceEntityName.toLowerCase()
        );
        
        // If no exact match, try partial match
        if (!referenceEntity) {
          referenceEntity = referenceEntities.find(
            (entity) => entity.name.toLowerCase().includes(cleanReferenceEntityName.toLowerCase()) ||
                         cleanReferenceEntityName.toLowerCase().includes(entity.name.toLowerCase())
          );
        }
        
        // If still no match, try word-by-word matching
        if (!referenceEntity) {
          const words = cleanReferenceEntityName.toLowerCase().split(/\s+/);
          // Try to match any significant word (longer than 3 chars)
          for (const word of words) {
            if (word.length > 3) {
              referenceEntity = referenceEntities.find(
                (entity) => entity.name.toLowerCase().includes(word)
              );
              if (referenceEntity) {
                console.log(`Found entity match using word '${word}':`, referenceEntity.name);
                break;
              }
            }
          }
        }
        
        if (referenceEntity) {
          console.log('Reference entity found by name:', referenceEntity);
          finalPositionX = referenceEntity.position_x + referenceEntityOffset;
          finalPositionY = referenceEntity.position_y;
        } else {
          console.log(`Could not find entity with name similar to "${cleanReferenceEntityName}"`);
          // If we still can't find a reference entity, use the first entity in the model as a fallback
          if (referenceEntities.length > 0) {
            console.log('Using first entity as fallback reference:', referenceEntities[0]);
            finalPositionX = referenceEntities[0].position_x + referenceEntityOffset;
            finalPositionY = referenceEntities[0].position_y;
          }
        }
      }
    }
    
    // Create entity data
    const entityData = {
      name: entityName,
      description: description || null,
      data_model_id: modelId,
      position_x: finalPositionX,
      position_y: finalPositionY
    };
    
    console.log('Creating standard entity:', entityData);
    
    // Create the entity
    const { data: entity, error: entityCreateError } = await adminClient
      .from('entities')
      .insert(entityData)
      .select()
      .single();
      
    if (entityCreateError) {
      console.error('Error creating entity:', entityCreateError);
      return NextResponse.json(
        { error: `Failed to create entity: ${entityCreateError.message}` },
        { status: 500 }
      );
    }

    console.log('Standard entity created successfully:', entity);
    
    // Create primary key attribute using the same approach as in /api/entities/route.ts
    const attributeData = {
      name: 'id',
      description: 'Primary key',
      data_type: 'uuid',
      is_required: true,
      is_unique: true,
      is_primary_key: true,
      entity_id: entity.id
    };
    
    console.log('Creating primary key attribute:', attributeData);
    
    // Simplified approach that matches the working implementation
    const { data: pkAttribute, error: pkAttributeError } = await adminClient
      .from('attributes')
      .insert(attributeData)
      .select()
      .single();
    
    if (pkAttributeError) {
      console.error('Error creating primary key attribute:', pkAttributeError);
      // Log the error but don't fail the whole request
      console.log('Will continue despite primary key creation error');
    } else {
      console.log('Primary key attribute created successfully:', pkAttribute);
    }

    return NextResponse.json({ 
      success: true,
      entity,
      primaryKey: pkAttribute,
      message: `Successfully created entity "${entityName}"`
    });
    
  } catch (error) {
    console.error('Error in POST /api/nl-interface/create-entity:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
