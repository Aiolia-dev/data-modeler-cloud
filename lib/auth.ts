import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/client'

export async function getSession() {
  const cookieStore = cookies()
  const supabase = createClient()
  
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    return null
  }
  
  return session
}
