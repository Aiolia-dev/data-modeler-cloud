import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

// PATCH /api/comments/[id] - Update a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const commentId = params.id;
  
  if (!commentId) {
    return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
  }
  
  try {
    // Get the request body
    const body = await request.json();
    const { content, position_x, position_y } = body;
    
    // Check if this is a position update or a content update
    const isPositionUpdate = position_x !== undefined && position_y !== undefined;
    const isContentUpdate = content !== undefined;
    
    if (!isPositionUpdate && (!content || typeof content !== 'string')) {
      return NextResponse.json({ error: 'Either content or position coordinates are required' }, { status: 400 });
    }
    
    // Use a direct approach with the service role key to bypass cookie issues
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Create a direct client without cookies
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Get the user email from the headers (if available)
    const userEmail = request.headers.get('x-user-email');
    
    // First, get the comment to check ownership
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching comment:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch comment' }, { status: 500 });
    }
    
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    // For content updates, check if the user is the owner of the comment
    // Position updates can be done by any user
    if (isContentUpdate && !isPositionUpdate && comment.user_email !== userEmail) {
      return NextResponse.json({ error: 'You can only edit the content of your own comments' }, { status: 403 });
    }
    
    // Prepare the update data
    const updateData: any = {};
    
    if (isContentUpdate) {
      updateData.content = content;
    }
    
    if (isPositionUpdate) {
      updateData.position_x = position_x;
      updateData.position_y = position_y;
    }
    
    console.log(`Updating comment ${commentId} with:`, updateData);
    
    // Update the comment
    const { data, error } = await supabase
      .from('comments')
      .update(updateData)
      .eq('id', commentId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating comment:', error);
      return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
    }
    
    return NextResponse.json({ comment: data });
  } catch (error) {
    console.error('Error in PATCH /api/comments/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/comments/[id] - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const commentId = params.id;
  
  if (!commentId) {
    return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
  }
  
  try {
    // Use a direct approach with the service role key to bypass cookie issues
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Create a direct client without cookies
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Delete the comment
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);
    
    if (error) {
      console.error('Error deleting comment:', error);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/comments/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
