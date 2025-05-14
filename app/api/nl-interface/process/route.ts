import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Process a natural language request to modify a data model
 * This API endpoint takes a natural language request and the current state of the data model,
 * and returns a response with the changes to be made to the data model.
 */
export async function POST(request: NextRequest) {
  console.log('POST /api/nl-interface/process - Processing natural language request');
  
  try {
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
    
    // Parse the request body
    let body;
    try {
      body = await request.json();
      console.log('Request body received');
    } catch (jsonError) {
      console.error('Error parsing request body:', jsonError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { request: nlRequest, history, currentState, dataModelId } = body;
    
    if (!nlRequest) {
      console.error('Natural language request is required');
      return NextResponse.json(
        { error: 'Natural language request is required' },
        { status: 400 }
      );
    }
    
    if (!dataModelId) {
      console.error('Data model ID is required');
      return NextResponse.json(
        { error: 'Data model ID is required' },
        { status: 400 }
      );
    }
    
    // Verify the data model exists and the user has access to it
    const adminClient = createAdminClient();
    const { data: dataModel, error: dataModelError } = await adminClient
      .from('data_models')
      .select('id, name, project_id')
      .eq('id', dataModelId)
      .single();
    
    if (dataModelError) {
      console.error('Error verifying data model:', dataModelError);
      return NextResponse.json(
        { error: 'Data model not found', details: dataModelError.message },
        { status: 404 }
      );
    }
    
    // Check if the user has access to the project
    const { data: projectAccess, error: projectAccessError } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', dataModel.project_id)
      .eq('user_id', user.id)
      .single();
    
    if (projectAccessError) {
      console.error('Error checking project access:', projectAccessError);
      return NextResponse.json(
        { error: 'Error checking project access', details: projectAccessError.message },
        { status: 500 }
      );
    }
    
    if (!projectAccess) {
      console.error('User does not have access to this project');
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }
    
    // Check if the user has editor role (required for making changes)
    if (projectAccess.role === 'viewer') {
      console.error('User has viewer role, cannot make changes');
      return NextResponse.json(
        { error: 'You need editor role to make changes to the data model' },
        { status: 403 }
      );
    }
    
    console.log('User has access to make changes to the data model');
    
    // Process the natural language request using OpenAI
    const response = await processWithAI(nlRequest, history, currentState, dataModelId);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing natural language request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * Process a natural language request using OpenAI
 * @param nlRequest The natural language request
 * @param history The conversation history
 * @param currentState The current state of the data model
 * @param dataModelId The ID of the data model
 * @returns A response with the changes to be made to the data model
 */
async function processWithAI(
  nlRequest: string,
  history: { role: string; content: string }[],
  currentState: any,
  dataModelId: string
) {
  try {
    // Create a system prompt that explains the task to the AI
    const systemPrompt = `You are an AI assistant that helps users modify data models through natural language instructions. 
Your task is to interpret the user's request and generate the appropriate changes to make to the data model.

The current data model has the following structure:
- Entities: ${JSON.stringify(currentState.entities)}
- Attributes: ${JSON.stringify(currentState.attributes)}
- Referentials: ${JSON.stringify(currentState.referentials)}
- Relationships: ${JSON.stringify(currentState.relationships)}
- Rules: ${JSON.stringify(currentState.rules)}

You should respond with:
1. A message explaining what changes you'll make
2. A JSON object containing the changes to be made to the data model

If you need more information from the user to complete the request, respond with:
1. A message asking for the specific information you need
2. A JSON object with requiresMoreInfo: true and requiredInfo object

Example response format:
{
  "message": "I'll add a new attribute 'email' to the User entity.",
  "changes": {
    "attributes": {
      "create": [
        {
          "name": "email",
          "description": "User's email address",
          "data_type": "varchar",
          "entity_id": "entity-id-here",
          "is_required": true,
          "is_unique": true,
          "is_primary_key": false,
          "is_foreign_key": false
        }
      ]
    }
  }
}

OR if more info is needed:

{
  "message": "What data type should the 'email' attribute have?",
  "requiresMoreInfo": true,
  "requiredInfo": {
    "type": "data_type",
    "options": ["varchar", "text", "integer", "boolean", "date", "timestamp", "uuid"]
  }
}

Remember to consider the existing structure and relationships in the data model when making changes.`;

    // Prepare the messages for the OpenAI API
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: nlRequest },
    ];

    // Call the OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages as any,
      temperature: 0.2,
      max_tokens: 2000,
    });

    // Extract the response from the OpenAI API
    const aiResponse = completion.choices[0].message.content;
    
    // Parse the response as JSON
    try {
      // The AI might return a response that includes markdown code blocks
      // We need to extract the JSON from the response
      const jsonMatch = aiResponse?.match(/```json\n([\s\S]*?)\n```/) || 
                        aiResponse?.match(/```\n([\s\S]*?)\n```/) ||
                        aiResponse?.match(/({[\s\S]*})/);
      
      if (jsonMatch && jsonMatch[1]) {
        // Parse the JSON from the code block
        const parsedResponse = JSON.parse(jsonMatch[1]);
        
        // Add the full message from the AI
        parsedResponse.message = parsedResponse.message || aiResponse?.replace(/```json\n[\s\S]*?\n```/g, '').trim();
        
        return parsedResponse;
      } else {
        // If no JSON was found, return a simple message response
        return {
          message: aiResponse,
          requiresMoreInfo: true,
          requiredInfo: {
            type: 'clarification',
          },
        };
      }
    } catch (parseError) {
      console.error('Error parsing AI response as JSON:', parseError);
      
      // If parsing fails, return a simple message response
      return {
        message: aiResponse || 'I understood your request, but I need more information to proceed.',
        requiresMoreInfo: true,
        requiredInfo: {
          type: 'clarification',
        },
      };
    }
  } catch (error) {
    console.error('Error processing with AI:', error);
    throw new Error('Failed to process request with AI');
  }
}
