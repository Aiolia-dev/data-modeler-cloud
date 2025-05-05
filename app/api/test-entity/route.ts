import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('POST /api/test-entity - Testing entity creation');
  
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
    
    // Just return success for testing
    return NextResponse.json({ 
      success: true,
      entity: {
        id: 'test-id-123',
        name: body.name,
        description: body.description,
        data_model_id: body.dataModelId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error in POST /api/test-entity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
