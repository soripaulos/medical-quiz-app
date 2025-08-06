import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    
    try {
      const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
      }

      if (user) {
        // Check current login count and manage sessions
        const sessionResult = await manageUserSessions(supabase, user)
        
        if (!sessionResult.success) {
          console.error('Session management failed:', sessionResult.error)
          return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(sessionResult.error || 'Session limit exceeded')}`)
        }

        // Create or update user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || '',
            role: 'student',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id'
          })

        if (profileError) {
          console.error('Profile creation/update error:', profileError)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${origin}/login?error=Authentication failed`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=No code provided`)
}

async function manageUserSessions(supabase: any, user: any): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user profile with logged_in_number
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('logged_in_number')
      .eq('id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching user profile:', fetchError)
      return { success: false, error: 'Failed to check session status' }
    }

    const currentLoginCount = profile?.logged_in_number || 0

    // Check if user has reached the session limit
    if (currentLoginCount >= 2) {
      return { 
        success: false, 
        error: 'Maximum concurrent sessions reached (2). Please sign out from another device first.' 
      }
    }

    // Increment the login count
    const newLoginCount = currentLoginCount + 1
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || '',
        role: profile?.role || 'student',
        logged_in_number: newLoginCount,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })

    if (updateError) {
      console.error('Error updating login count:', updateError)
      return { success: false, error: 'Failed to update session status' }
    }

    console.log(`User ${user.id} login count updated to ${newLoginCount}`)
    return { success: true }

  } catch (error) {
    console.error('Unexpected error in session management:', error)
    return { success: false, error: 'Session management failed' }
  }
}

