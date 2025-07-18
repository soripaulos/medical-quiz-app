"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { User, Session } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Listen for auth changes
  useEffect(() => {
    const { data: { user } } = supabase.auth.getUser()
    setUser(user)
    setLoading(false)

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Handle auth events with session preservation
      if (event === 'SIGNED_OUT') {
        // Check if user is in an active test session before redirecting
        const activeSession = localStorage.getItem('activeTestSession')
        if (!activeSession) {
          router.push('/login')
          router.refresh()
        } else {
          // Delay redirect to allow session cleanup
          setTimeout(() => {
            router.push('/login')
            router.refresh()
          }, 1000)
        }
      } else if (event === 'SIGNED_IN') {
        // Check if user was in a test session before signing in
        const activeSession = localStorage.getItem('activeTestSession')
        if (activeSession) {
          try {
            const sessionData = JSON.parse(activeSession)
            // Redirect back to the test session
            router.push(`/test/${sessionData.sessionId}`)
          } catch (error) {
            console.error('Error parsing active session:', error)
            router.push('/')
          }
        } else {
          router.push('/')
        }
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (error) throw error
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      })

      if (error) throw error
      setLoading(false)
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return React.createElement(AuthContext.Provider, { value: value }, children)
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    // During build time or when AuthProvider is not available, return default values
    return {
      user: null,
      loading: false,
      signIn: async () => { throw new Error("Auth not available") },
      signUp: async () => { throw new Error("Auth not available") },
      signOut: async () => { throw new Error("Auth not available") }
    }
  }
  return context
} 