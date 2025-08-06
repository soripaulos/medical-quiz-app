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
    isAtLimit: sessionCount >= 2,
  }
}