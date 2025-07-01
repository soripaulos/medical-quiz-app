"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User, Session } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: "student" | "admin"
  created_at: string
  updated_at: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    setLoading(true)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      // First try to get existing profile
      let { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle() // Use maybeSingle instead of single to handle no rows gracefully

      if (error) {
        console.error("Error fetching profile:", error)
        throw error
      }

      // If no profile exists, create one
      if (!data) {
        const { data: userData } = await supabase.auth.getUser()

        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            email: userData.user?.email || "",
            full_name: userData.user?.user_metadata?.full_name || userData.user?.email || "",
            role: "student",
          })
          .select()
          .single()

        if (createError) {
          console.error("Error creating profile:", createError)
          throw createError
        }

        data = newProfile
      }

      setProfile(data)
    } catch (error) {
      console.error("Error in fetchProfile:", error)

      // If we still can't get a profile, try to create a basic one
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (userData.user) {
          const { data: fallbackProfile, error: fallbackError } = await supabase
            .from("profiles")
            .upsert(
              {
                id: userId,
                email: userData.user.email || "",
                full_name: userData.user.user_metadata?.full_name || userData.user.email || "",
                role: "student",
              },
              {
                onConflict: "id",
              },
            )
            .select()
            .single()

          if (!fallbackError && fallbackProfile) {
            setProfile(fallbackProfile)
          }
        }
      } catch (fallbackError) {
        console.error("Fallback profile creation failed:", fallbackError)
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (error) throw error

      // Profile will be fetched automatically via the auth state change listener
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      })

      if (error) throw error

      // For email confirmation flow, we don't automatically sign in
      setLoading(false)
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    // Clear local state
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (user) {
      setLoading(true)
      await fetchProfile(user.id)
    }
  }

  const contextValue = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }

  return React.createElement(AuthContext.Provider, { value: contextValue }, children)
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
