import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId } = body
    
    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 })
    }
    
    // Connect directly to database with server-side client
    const supabase = createRouteHandlerClient({ cookies })
    
    // Create a helper function for direct superuser updates
    const { data, error } = await supabase.rpc('admin_set_superuser', { 
      target_user_id: userId
    })
    
    if (error) {
      console.error('Database error:', error)
      
      // If the RPC fails, try a direct query approach
      try {
        // Get the current user to validate we have a session
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          return NextResponse.json({ 
            success: false, 
            message: 'Authentication error: ' + (userError?.message || 'No user found'),
            step: 'auth-check'
          }, { status: 401 })
        }
        
        // Try a direct update via our admin function
        const { error: directError } = await supabase.from('superuser_operations')
          .insert({ 
            user_id: userId,
            operation: 'promote',
            performed_by: user.id
          })
        
        if (directError) {
          throw directError
        }
        
        return NextResponse.json({ 
          success: true,
          message: 'Superuser status set via direct update',
          method: 'direct'
        })
      } catch (directError: any) {
        console.error('Direct update error:', directError)
        return NextResponse.json({ 
          success: false, 
          message: 'All update methods failed: ' + directError.message,
          originalError: error.message
        }, { status: 500 })
      }
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Superuser status set successfully via RPC',
      data,
      method: 'rpc'
    })
  } catch (error: any) {
    console.error('Server error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Unexpected error: ' + error.message 
    }, { status: 500 })
  }
}
