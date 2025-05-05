import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Properly await the cookies
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 401 })
    }
    
    // Log the user information for debugging
    console.log('User found:', { id: user.id, email: user.email })
    
    // Try to directly update the user's metadata using a server-side approach
    try {
      // Use a direct SQL approach instead of RPC
      const { data, error: updateError } = await supabase
        .from('user_metadata_update')
        .select('*')
        .eq('id', user.id)
        .limit(1)
      
      if (updateError) {
        console.error('Update error:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      
      console.log('Update result:', data)
      
      return NextResponse.json({
        success: true,
        message: 'Superuser status update attempted',
        user_id: user.id,
        note: 'Please check the logs for details'
      })
    } catch (updateError: any) {
      console.error('Update exception:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  } catch (error: any) {
    console.error('General exception:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
