import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const relationshipId = id;
    
    if (!relationshipId) {
      return NextResponse.json(
        { error: 'Relationship ID is required' },
        { status: 400 }
      );
    }

    console.log(`DELETE /api/relationships/${relationshipId} - Deleting relationship`);
    
    const adminClient = createAdminClient();
    
    // First, fetch the relationship to log what we're deleting
    const { data: relationshipData, error: fetchError } = await adminClient
      .from('relationships')
      .select('*')
      .eq('id', relationshipId)
      .single();
      
    if (fetchError) {
      console.error(`Error fetching relationship ${relationshipId}:`, fetchError);
      // Continue with deletion even if fetch fails
    } else {
      console.log(`Deleting relationship:`, relationshipData);
    }
    
    // Delete the relationship
    const { error: deleteError } = await adminClient
      .from('relationships')
      .delete()
      .eq('id', relationshipId);

    if (deleteError) {
      console.error(`Error deleting relationship ${relationshipId}:`, deleteError);
      return NextResponse.json(
        { error: `Failed to delete relationship: ${deleteError.message}` },
        { status: 500 }
      );
    }

    console.log(`Successfully deleted relationship ${relationshipId}`);
    return NextResponse.json({ 
      success: true,
      message: `Relationship ${relationshipId} deleted successfully`
    });
  } catch (error: any) {
    console.error(`Error in DELETE /api/relationships/[id]:`, error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
