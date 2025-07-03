import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: "student" | "admin"
  created_at: string
  updated_at: string
  active_session_id?: string | null
}

export interface AuthSession {
  user: User
  profile: UserProfile
}

// Check if we're in a build environment or missing required env vars
function isBuildTime(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

// Cache the session verification to avoid multiple database calls
export const verifySession = cache(async (): Promise<AuthSession | null> => {
  // Handle build time when env vars are not available
  if (isBuildTime()) {
    return null
  }

  try {
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return null
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      // If no profile exists, create one
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.email || '',
          role: 'student',
        })
        .select()
        .single()

      if (createError || !newProfile) {
        console.error('Failed to create user profile:', createError)
        return null
      }

      return {
        user: session.user,
        profile: newProfile
      }
    }

    return {
      user: session.user,
      profile
    }
  } catch (error) {
    // Handle Supabase client creation errors (e.g., missing env vars during build)
    if (error instanceof Error && error.message.includes("Supabase environment variables")) {
      return null
    }
    console.error('Session verification failed:', error)
    return null
  }
})

// Get current user (requires authentication)
export const getUser = cache(async (): Promise<UserProfile> => {
  // Handle build time
  if (isBuildTime()) {
    redirect('/login')
  }

  const session = await verifySession()
  
  if (!session) {
    redirect('/login')
  }
  
  return session.profile
})

// Check if user is admin
export const requireAdmin = cache(async (): Promise<UserProfile> => {
  // Handle build time
  if (isBuildTime()) {
    redirect('/login')
  }

  const session = await verifySession()
  
  if (!session) {
    redirect('/login')
  }
  
  if (session.profile.role !== 'admin') {
    redirect('/')
  }
  
  return session.profile
})

// Sign out function
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// Server-side redirect helpers
export async function redirectToLogin() {
  redirect('/login')
}

export async function redirectToDashboard() {
  redirect('/')
}

// Check auth status without throwing (for conditional rendering)
export const checkAuthStatus = cache(async (): Promise<{ isAuthenticated: boolean; user?: UserProfile }> => {
  const session = await verifySession()
  
  if (!session) {
    return { isAuthenticated: false }
  }
  
  return { isAuthenticated: true, user: session.profile }
})
