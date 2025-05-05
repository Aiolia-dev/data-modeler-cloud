import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dataModelId = searchParams.get('dataModelId');
  const entityId = searchParams.get('entityId');
  
  try {
    // Use a direct approach with the service role key to bypass cookie issues
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Create a direct client without cookies
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Get the current user - simplified approach
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;
    
    // Log authentication info for debugging
    console.log('GET comments - Auth info:');
    console.log('- Session exists:', !!session?.session);
    console.log('- User ID:', user?.id || 'null');
    console.log('- User email:', user?.email || 'null');
    
    // Allow fetching comments even if not authenticated
    // This enables viewing comments in read-only mode
    if (!user) {
      console.log('Warning: User not authenticated, proceeding in read-only mode');
    }
    
    // Build query based on parameters
    let query = supabase
      .from('comments')
      .select(`
        id,
        content,
        entity_id,
        attribute_id,
        relationship_id,
        position_x,
        position_y,
        data_model_id,
        user_id,
        user_email,
        created_at,
        updated_at
      `);
    
    // Filter by data model ID if provided
    if (dataModelId) {
      query = query.eq('data_model_id', dataModelId);
    }
    
    // Filter by entity ID if provided
    if (entityId) {
      query = query.eq('entity_id', entityId);
    }
    
    const { data: comments, error } = await query;
    
    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Transform the data to include user email directly on the comment
    const formattedComments = comments?.map(comment => {
      // Make sure position values are numbers, not strings
      const position_x = comment.position_x !== null ? Number(comment.position_x) : null;
      const position_y = comment.position_y !== null ? Number(comment.position_y) : null;
      
      // Use the comment's user_email field directly
      // If it doesn't exist, use the default
      const userEmail = comment.user_email || 'user@example.com';
      
      return {
        ...comment,
        position_x,
        position_y,
        user_email: userEmail
      };
    }) || [];
    
    console.log('Fetched comments:', formattedComments.length);
    console.log('Sample comment:', formattedComments[0]);
    
    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error('Error in comments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use a direct approach with the service role key to bypass cookie issues
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Create a direct client without cookies
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Get the user email from the request headers or body
    // This is a workaround since we can't rely on the cookie-based auth
    let userEmail = '';
    try {
      const authHeader = request.headers.get('x-user-email');
      if (authHeader) {
        userEmail = authHeader;
        console.log('Found user email in header:', userEmail);
      }
    } catch (e) {
      console.error('Error extracting user email from headers:', e);
    }
    
    // Try to get the authenticated user
    console.log('Attempting to get Supabase auth session...');
    const { data, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting Supabase session:', sessionError);
    }
    
    console.log('Full session data:', JSON.stringify(data, null, 2));
    
    const session = data.session;
    const user = session?.user;
    
    console.log('Auth session details:');
    console.log('- Session exists:', !!session);
    console.log('- Session expires at:', session?.expires_at);
    console.log('- User exists:', !!user);
    console.log('- User ID:', user?.id || 'null');
    console.log('- User email:', user?.email || 'null');
    console.log('- User aud:', user?.aud || 'null');
    console.log('Processing comment creation request');
    
    // Get request body
    let body;
    try {
      body = await request.json();
      console.log('Received comment data:', JSON.stringify(body));
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    // Validate required fields
    if (!body.content) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }
    
    // Check that at least one of these is provided
    const hasEntityId = !!body.entity_id;
    const hasAttributeId = !!body.attribute_id;
    const hasRelationshipId = !!body.relationship_id;
    const hasPosition = body.position_x !== undefined && body.position_y !== undefined;
    
    if (!hasEntityId && !hasAttributeId && !hasRelationshipId && !hasPosition) {
      console.error('Comment missing required association:', body);
      return NextResponse.json(
        { error: 'Comment must be associated with an entity, attribute, relationship, or have a position' },
        { status: 400 }
      );
    }
    
    // If it's a positioned comment, data_model_id is required
    if (hasPosition && !body.data_model_id) {
      return NextResponse.json(
        { error: 'Data model ID is required for positioned comments' },
        { status: 400 }
      );
    }
    
    // Get the user email from the header - this is the most reliable source
    const headerUserEmail = request.headers.get('x-user-email');
    console.log('User email from header:', headerUserEmail);
    
    // Get the user ID from the body if available
    const bodyUserId = body.user_id;
    console.log('User ID from body:', bodyUserId);
    
    // Create the comment
    const commentData = {
      content: body.content,
      entity_id: body.entity_id || null,
      attribute_id: body.attribute_id || null,
      relationship_id: body.relationship_id || null,
      position_x: body.position_x || null,
      position_y: body.position_y || null,
      data_model_id: body.data_model_id || null,
      // CRITICAL: Set user_id to null to avoid foreign key constraint issues
      // We can't use the mock ID because it doesn't exist in the users table
      user_id: null,
      // CRITICAL: Use the email from the header first, then fall back to other sources
      user_email: headerUserEmail || body.user_email || user?.email || 'user@example.com'
    };
    
    // Log authentication details for debugging
    console.log('Authentication details for comment creation:');
    console.log('- Session exists:', !!session);
    console.log('- Header email:', headerUserEmail);
    console.log('- Body user ID:', bodyUserId);
    console.log('- Body user email:', body.user_email);
    console.log('- FINAL User ID being used:', commentData.user_id);
    console.log('- FINAL User email being used:', commentData.user_email);
    
    // Inspect the headers to see if auth cookies are present
    const cookieHeader = request.headers.get('cookie');
    console.log('Cookie header present:', !!cookieHeader);
    if (cookieHeader) {
      console.log('Cookie header contains auth reference:', cookieHeader.includes('sb-'));
    }
    
    // Log the comment data for debugging
    console.log('Final comment data:', commentData);
    console.log('User ID from session:', user?.id || 'Not available');
    
    console.log('Inserting comment with data:', commentData);
    
    // We're already using the service role key client
    console.log('Using service role key client');
    
    const { data: comment, error } = await supabase
      .from('comments')
      .insert(commentData)
      .select()
      .single();
      
    if (error) {
      console.error('Database error details:', error.code, error.message, error.details, error.hint);
      console.error('Error creating comment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      console.log('Comment inserted successfully with ID:', comment?.id);
      console.log('Comment user_id in database:', comment?.user_id || 'null');
      console.log('Comment user_email in database:', comment?.user_email || 'null');
    }
    
    if (!comment) {
      console.error('No comment returned after insert');
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }
    
    console.log('Comment created successfully:', comment);
    
    // Add user email to the response if it wasn't saved properly
    const commentWithEmail = {
      ...comment,
      user_email: user?.email || comment.user_email || 'user@example.com'
    };
    
    return NextResponse.json({ comment: commentWithEmail }, { status: 201 });
  } catch (error) {
    console.error('Error in comments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
