"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "./use-auth"

export function useSessionStatus() {
  const [sessionCount, setSessionCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  // Fetch current session count
  const fetchSessionCount = async () => {
    if (!user?.id) {
      setSessionCount(0)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('logged_in_number')
        .eq('id', user.id)
        .single()

      if (fetchError) {
        console.error('Error fetching session count:', fetchError)
        setError('Failed to fetch session status')
        setSessionCount(0)
      } else {
        setSessionCount(profile?.logged_in_number || 0)
        setError(null)
      }
    } catch (err) {
      console.error('Unexpected error fetching session count:', err)
      setError('Failed to fetch session status')
      setSessionCount(0)
    } finally {
      setLoading(false)
    }
  }

  // Reset all other sessions (keep current session only)
  const resetOtherSessions = async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const response = await fetch('/api/auth/reset-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to reset sessions' }
      }

      // Refresh session count after reset
      await fetchSessionCount()

      return { success: true, message: data.message }
    } catch (err) {
      console.error('Error resetting sessions:', err)
      return { success: false, error: 'Failed to reset sessions' }
    }
  }

  // Fetch session count when user changes
  useEffect(() => {
    fetchSessionCount()
  }, [user?.id])

  // Set up periodic refresh (every 30 seconds)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(fetchSessionCount, 30000)
    return () => clearInterval(interval)
  }, [user?.id])

  return {
    sessionCount,
    loading,
    error,
    refreshSessionCount: fetchSessionCount,
    resetOtherSessions,
    isAtLimit: sessionCount >= 2,
  }
}