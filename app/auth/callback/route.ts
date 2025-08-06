import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SessionManager } from '@/lib/session-management'

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
        // Get user agent and IP for session tracking
        const userAgent = request.headers.get('user-agent') || undefined
        const forwardedFor = request.headers.get('x-forwarded-for')
        const realIp = request.headers.get('x-real-ip')
        const ipAddress = forwardedFor?.split(',')[0] || realIp || request.ip || undefined

        // Check and manage active sessions (limit to 2)
        const sessionManager = new SessionManager(supabase)
        const sessionResult = await sessionManager.createSession(user.id, userAgent, ipAddress)
        
        if (!sessionResult.success) {
          console.error('Failed to create user session')
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

