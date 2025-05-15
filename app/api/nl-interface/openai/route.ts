import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';

// Define the expected request body structure
type RequestBody = {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  projectId: string;
  modelId: string;
};

export async function POST(request: Request) {
  try {
    // Add debugging to help identify issues
    console.log('API route called: /api/nl-interface/openai');
    // Authenticate the user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body: RequestBody = await request.json();
    
    if (!body.messages || !Array.isArray(body.messages) || !body.projectId || !body.modelId) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Initialize OpenAI client
    // During build time, this will be undefined, but that's okay as we handle it gracefully
    let openai: OpenAI | null = null;
    
    try {
      const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      
      console.log('OpenAI API Key available:', !!apiKey); // Log whether we have an API key (not the key itself)
      
      if (!apiKey) {
        console.error('OpenAI API key not found');
        return NextResponse.json(
          { 
            error: 'OpenAI API key not configured', 
            message: 'Please add your OpenAI API key to the .env.local file as OPENAI_API_KEY=your-key'
          },
          { status: 500 }
        );
      }
      
      openai = new OpenAI({
        apiKey: apiKey,
      });
    } catch (error) {
      console.error('Error initializing OpenAI client:', error);
      return NextResponse.json(
        { error: 'Failed to initialize OpenAI client' },
        { status: 500 }
      );
    }

    // Add system message with context about data modeling
    const systemMessage = {
      role: 'system' as const,
      content: `You are an AI assistant specialized in data modeling. Help the user modify their data model by interpreting their natural language requests.
      
      The user is working with a data model that has entities, attributes, relationships, referentials, and rules.
      
      IMPORTANT GUIDELINES:
      - Pay careful attention to the specific operation the user wants to perform (create, update, delete)
      - Distinguish clearly between entities and attributes
      - When a user mentions adding an attribute TO an entity, they want to modify an existing entity, not create a new one
      - If a user says "add attribute X to entity Y", they want to add a new attribute to an existing entity Y
      - If a user says "create entity X" or "create table X", they want to create a new standard entity
      - Always confirm your understanding by being specific about what you're modifying
      
      ATTRIBUTE CREATION GUIDELINES:
      - When creating an attribute, you MUST specify a data_type
      - Valid data types are: text, integer, float, boolean, date, timestamp, uuid, jsonb
      - If the user doesn't specify a data type, you MUST ask them what data type they want
      - For attributes, always specify the entity they belong to using the 'entity' field
      - The 'attribute' field should contain the name of the attribute being created
      - You can specify additional properties like is_required, is_unique, is_primary_key, default_value, and length
      
      STANDARD ENTITY CREATION GUIDELINES:
      - When a user asks to create an entity or table (without specifying a join entity), use the operation 'add_entity'
      - The 'entity' field should contain the name of the new entity to be created
      - If the user doesn't specify a name, use 'Untitled_entity' as the default name
      - The system will automatically create a primary key attribute (id) for the entity
      - The entity_type will be set to 'standard' automatically
      - The user will be asked where to place the entity on the diagram if they don't specify a position
      
      JOIN ENTITY CREATION GUIDELINES:
      - A join entity (also called junction table, association table, or linking table) connects two existing entities in a many-to-many relationship
      - When creating a join entity, you MUST specify both source and target entities using the 'source_entity' and 'target_entity' fields
      - The 'entity' field should contain the name of the new join entity to be created
      - Use the operation 'add_join_entity' for creating join entities
      - The system will automatically create the necessary foreign key attributes and relationships
      - Provide a descriptive name for the join entity that reflects its purpose (e.g., 'StudentCourse' for joining 'Student' and 'Course')
      
      IMPORTANT: Recognize various ways users might request join entity creation:
      - "Create a join entity between X and Y"
      - "Create a junction table between X and Y"
      - "Create an association table for X and Y"
      - "Make a join entity connecting X and Y"
      - "I want to create a join entity between entity X and entity Y"
      - "Create a join table called Z between X and Y"
      - "Add a many-to-many relationship between X and Y using a join entity"
      
      For all these variations, interpret them as requests to create a join entity with operation 'add_join_entity'
      
      When the user asks to make changes:
      1. Understand what they want to create, update, or delete
      2. Ask clarifying questions if needed (especially for data type when creating attributes)
      3. Provide a clear response explaining what changes will be made
      4. Return a structured list of changes to be applied
      
      Always be specific about what entities, attributes, or relationships you're modifying.
      
      EXAMPLE 1: If a user says "create an attribute called email for the Customer entity", you should:
      1. Ask what data type the email attribute should be if not specified
      2. Once you have the data type, create an attribute with operation "add_attribute", entity "Customer", attribute "email", and the specified data_type
      
      EXAMPLE 2: If a user says "create a join entity between Student and Course", you should:
      1. Create a join entity with operation "add_join_entity", entity "StudentCourse", source_entity "Student", and target_entity "Course"
      2. The system will automatically create the necessary foreign keys and relationships`
    };

    // Check if OpenAI client is initialized
    if (!openai) {
      console.error('OpenAI client not initialized');
      return NextResponse.json(
        { error: 'OpenAI client not initialized' },
        { status: 500 }
      );
    }
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview', // Use the appropriate model
      messages: [systemMessage, ...body.messages],
      temperature: 0.7,
      max_tokens: 1000,
      function_call: { name: 'generate_model_changes' },
      functions: [
        {
          name: 'generate_model_changes',
          description: 'Generate changes to be applied to the data model based on user request',
          parameters: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'The response message to show to the user. Be specific about what you understood from their request.'
              },
              changes: {
                type: 'array',
                description: 'List of changes to apply to the data model',
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['create', 'update', 'delete'],
                      description: 'Type of change. Use "create" for new entities or attributes, "update" for modifying existing ones, and "delete" for removing them.'
                    },
                    operation: {
                      type: 'string',
                      enum: ['add_entity', 'add_attribute', 'modify_entity', 'modify_attribute', 'delete_entity', 'delete_attribute', 'add_relationship', 'modify_relationship', 'delete_relationship', 'add_join_entity'],
                      description: 'Specific operation being performed. This helps clarify the exact action.'
                    },
                    entity: {
                      type: 'string',
                      description: 'Name of the entity to modify. For attribute operations, this is the parent entity that contains the attribute.'
                    },
                    attribute: {
                      type: 'string',
                      description: 'Name of the attribute to modify (if applicable). Only specify this for attribute operations.'
                    },
                    data_type: {
                      type: 'string',
                      description: 'Data type of the attribute (if applicable). Must be one of: text, integer, float, boolean, date, timestamp, uuid, jsonb.'
                    },
                    is_required: {
                      type: 'boolean',
                      description: 'Whether the attribute is required (not null)'
                    },
                    is_unique: {
                      type: 'boolean',
                      description: 'Whether the attribute value must be unique'
                    },
                    is_primary_key: {
                      type: 'boolean',
                      description: 'Whether the attribute is a primary key'
                    },
                    default_value: {
                      type: 'string',
                      description: 'Default value for the attribute (if applicable)'
                    },
                    length: {
                      type: 'integer',
                      description: 'Length constraint for the attribute (if applicable)'
                    },
                    description: {
                      type: 'string',
                      description: 'Description of the attribute or entity'
                    },
                    referential: {
                      type: 'string',
                      description: 'Name of the referential to modify (if applicable)'
                    },
                    relationship: {
                      type: 'string',
                      description: 'Name of the relationship to modify (if applicable)'
                    },
                    rule: {
                      type: 'string',
                      description: 'Name of the rule to modify (if applicable)'
                    },
                    source_entity: {
                      type: 'string',
                      description: 'Name of the source entity when creating a join entity'
                    },
                    target_entity: {
                      type: 'string',
                      description: 'Name of the target entity when creating a join entity'
                    },
                    details: {
                      type: 'string',
                      description: 'Detailed description of the change. Be specific about what is being modified.'
                    }
                  },
                  required: ['type', 'operation', 'details']
                }
              },
              need_more_info: {
                type: 'boolean',
                description: 'Set to true if you need more information from the user to complete the request'
              },
              missing_info: {
                type: 'string',
                description: 'Description of what additional information is needed from the user'
              }
            },
            required: ['message', 'changes']
          }
        }
      ]
    });

    // Extract the function call result
    const functionCall = completion.choices[0]?.message?.function_call;
    
    if (functionCall && functionCall.name === 'generate_model_changes') {
      try {
        const parsedArgs = JSON.parse(functionCall.arguments || '{}');
        return NextResponse.json({
          message: parsedArgs.message || 'I understand your request and have prepared the changes.',
          changes: parsedArgs.changes || []
        });
      } catch (error) {
        console.error('Error parsing function call arguments:', error);
        return NextResponse.json({
          message: 'I had trouble processing your request. Could you please be more specific?',
          changes: []
        });
      }
    }

    // Fallback if function call wasn't used
    return NextResponse.json({
      message: completion.choices[0]?.message?.content || 'I understand your request, but need more details to proceed.',
      changes: []
    });
  } catch (error) {
    // Log detailed error information for debugging
    console.error('Error processing request:', error);
    
    // Provide more specific error messages based on the error type
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Check for specific error types
      if (error.message.includes('OpenAI')) {
        return NextResponse.json(
          { error: 'OpenAI API error: ' + error.message },
          { status: 500 }
        );
      }
      
      if (error.message.includes('authentication') || error.message.includes('auth')) {
        return NextResponse.json(
          { error: 'Authentication error: ' + error.message },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
