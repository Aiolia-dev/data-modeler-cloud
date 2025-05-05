import { NextResponse } from 'next/server';

export async function GET() {
  console.log('GET /api/test - Test endpoint called');
  return NextResponse.json({ message: 'API test endpoint is working' });
}

export async function POST(request: Request) {
  console.log('POST /api/test - Test endpoint called');
  
  try {
    const body = await request.json();
    return NextResponse.json({ 
      message: 'API test endpoint is working', 
      receivedData: body 
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to parse request body' },
      { status: 400 }
    );
  }
}
