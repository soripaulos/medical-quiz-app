"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "./use-auth"

interface SessionInfo {
  id: string
  timestamp: number
  userAgent: string
  lastActivity: number
}

const SESSION_LIMIT = 2
const SESSION_KEY = 'medprep_sessions'
const CURRENT_SESSION_KEY = 'medprep_current_session'
const SESSION_CHECK_INTERVAL = 30000 // 30 seconds
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours

export function useSessionLimit() {
  const [isSessionValid, setIsSessionValid] = useState(true)
  const [sessionWarning, setSessionWarning] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  // Generate a unique session ID for this browser/tab
  const generateSessionId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Get stored sessions for the current user
  const getStoredSessions = (): SessionInfo[] => {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(`${SESSION_KEY}_${user?.id}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  // Save sessions to localStorage
  const saveStoredSessions = (sessions: SessionInfo[]) => {
    if (typeof window === 'undefined' || !user?.id) return
    
    try {
      localStorage.setItem(`${SESSION_KEY}_${user.id}`, JSON.stringify(sessions))
    } catch (error) {
      console.error('Failed to save sessions:', error)
    }
  }

  // Get current session ID
  const getCurrentSessionId = (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(CURRENT_SESSION_KEY)
  }

  // Set current session ID
  const setCurrentSessionId = (sessionId: string) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(CURRENT_SESSION_KEY, sessionId)
  }

  // Clean up expired sessions
  const cleanupExpiredSessions = (sessions: SessionInfo[]): SessionInfo[] => {
    const now = Date.now()
    return sessions.filter(session => now - session.lastActivity < SESSION_TIMEOUT)
  }

  // Update session activity
  const updateSessionActivity = () => {
    if (!user?.id) return

    const currentSessionId = getCurrentSessionId()
    if (!currentSessionId) return

    const sessions = getStoredSessions()
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, lastActivity: Date.now() }
        : session
    )
    
    saveStoredSessions(updatedSessions)
  }

  // Check if current session is still valid
  const checkSessionValidity = async () => {
    if (!user?.id) return

    try {
      // Check if user is still authenticated with Supabase
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        setIsSessionValid(false)
        setSessionWarning("Your session has expired. Please sign in again.")
        return
      }

      const currentSessionId = getCurrentSessionId()
      if (!currentSessionId) {
        // No session ID means this is a new session
        await initializeSession()
        return
      }

      const sessions = cleanupExpiredSessions(getStoredSessions())
      const currentSession = sessions.find(s => s.id === currentSessionId)
      
      if (!currentSession) {
        // Current session not found in stored sessions - might have been removed
        setIsSessionValid(false)
        setSessionWarning("Your session was ended from another device. Please sign in again.")
        return
      }

      // Update activity for current session
      updateSessionActivity()
      setIsSessionValid(true)
      setSessionWarning(null)

    } catch (error) {
      console.error('Session check failed:', error)
    }
  }

  // Initialize a new session
  const initializeSession = async () => {
    if (!user?.id) return

    const newSessionId = generateSessionId()
    const userAgent = navigator.userAgent || 'Unknown'
    const now = Date.now()

    let sessions = cleanupExpiredSessions(getStoredSessions())

    // If we have reached the session limit, remove the oldest session
    if (sessions.length >= SESSION_LIMIT) {
      sessions.sort((a, b) => a.lastActivity - b.lastActivity)
      sessions = sessions.slice(-(SESSION_LIMIT - 1)) // Keep only the most recent sessions
      
      setSessionWarning("You have reached the maximum number of concurrent sessions (2). Your oldest session has been ended.")
    }

    // Add the new session
    const newSession: SessionInfo = {
      id: newSessionId,
      timestamp: now,
      userAgent,
      lastActivity: now
    }

    sessions.push(newSession)
    saveStoredSessions(sessions)
    setCurrentSessionId(newSessionId)
    setIsSessionValid(true)

    // Clear warning after a few seconds
    if (sessionWarning) {
      setTimeout(() => setSessionWarning(null), 5000)
    }
  }

  // Handle sign out - clean up session data
  const handleSignOut = () => {
    if (!user?.id) return

    const currentSessionId = getCurrentSessionId()
    if (currentSessionId) {
      let sessions = getStoredSessions()
      sessions = sessions.filter(s => s.id !== currentSessionId)
      saveStoredSessions(sessions)
    }

    localStorage.removeItem(CURRENT_SESSION_KEY)
    setIsSessionValid(true)
    setSessionWarning(null)
  }

  // Get active session count
  const getActiveSessionCount = (): number => {
    if (!user?.id) return 0
    return cleanupExpiredSessions(getStoredSessions()).length
  }

  // Force end all other sessions
  const endAllOtherSessions = () => {
    if (!user?.id) return

    const currentSessionId = getCurrentSessionId()
    if (!currentSessionId) return

    const sessions = getStoredSessions()
    const currentSession = sessions.find(s => s.id === currentSessionId)
    
    if (currentSession) {
      saveStoredSessions([currentSession])
      setSessionWarning("All other sessions have been ended.")
      setTimeout(() => setSessionWarning(null), 3000)
    }
  }

  // Initialize session when user logs in
  useEffect(() => {
    if (user) {
      initializeSession()
    } else {
      handleSignOut()
    }
  }, [user?.id])

  // Set up periodic session checks
  useEffect(() => {
    if (!user) return

    const interval = setInterval(checkSessionValidity, SESSION_CHECK_INTERVAL)
    
    // Also check immediately
    checkSessionValidity()

    return () => clearInterval(interval)
  }, [user?.id])

  // Update activity on user interaction
  useEffect(() => {
    if (!user) return

    const updateActivity = () => updateSessionActivity()
    
    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity)
      })
    }
  }, [user?.id])

  // Handle page visibility changes
  useEffect(() => {
    if (!user) return

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSessionValidity()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user?.id])

  return {
    isSessionValid,
    sessionWarning,
    activeSessionCount: getActiveSessionCount(),
    endAllOtherSessions,
    checkSessionValidity
  }
}