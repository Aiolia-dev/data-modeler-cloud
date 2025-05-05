import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 401 })
    }
    
    // Try to directly update the user's metadata
    const { error: updateError } = await supabase.rpc('admin_set_superuser', {
      target_user_id: user.id
    })
    
    // Check if the is_superuser function works
    const { data: isSuperuser, error: superuserError } = await supabase.rpc('is_superuser')
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata
      },
      is_superuser: {
        result: isSuperuser,
        error: superuserError ? superuserError.message : null
      },
      update_result: {
        error: updateError ? updateError.message : 'Success'
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
