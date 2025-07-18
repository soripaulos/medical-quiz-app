"use client"

import React from 'react'
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { UserSession, Question, UserAnswer, UserQuestionProgress } from '@/lib/types'

interface SessionState {
  // Session data
  session: UserSession | null
  questions: Question[]
  userAnswers: UserAnswer[]
  userProgress: UserQuestionProgress[]
  
  // Loading states
  loading: boolean
  error: string | null
  
  // Real-time status
  isRealTimeEnabled: boolean
  
  // Actions
  loadSession: (sessionId: string) => Promise<void>
  clearSession: () => void
  updateAnswer: (questionId: string, answer: UserAnswer) => void
  updateProgress: (questionId: string, progress: UserQuestionProgress) => void
  refreshSessionData: (sessionId: string) => Promise<void>
  updateSessionStats: (sessionId: string, correctAnswers: number, incorrectAnswers: number, currentQuestionIndex: number) => Promise<void>
  
  // Real-time subscription (Phase 3)
  subscribeToSession: (sessionId: string) => void
  unsubscribeFromSession: () => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  // Initial state
  session: null,
  questions: [],
  userAnswers: [],
  userProgress: [],
  loading: false,
  error: null,
  isRealTimeEnabled: false,

  // Load session data from API
  loadSession: async (sessionId: string) => {
    const currentState = get()
    set({ loading: true, error: null })
    
    try {
      // First try to get session from cache if available
      const cachedSession = localStorage.getItem(`session_${sessionId}_cache`)
      if (cachedSession) {
        try {
          const cached = JSON.parse(cachedSession)
          // Use cached data temporarily while loading fresh data
          set({
            session: cached.session,
            questions: cached.questions || [],
            userAnswers: cached.userAnswers || [],
            userProgress: cached.userProgress || [],
            loading: true, // Still loading fresh data
            error: null
          })
        } catch (cacheError) {
          console.warn('Error parsing cached session data:', cacheError)
        }
      }

      const response = await fetch(`/api/sessions/${sessionId}`)
      
      if (response.status === 401) {
        throw new Error("You need to be logged in to access this session")
      }
      
      if (response.status === 404) {
        throw new Error("Session not found. It may have been deleted or doesn't exist.")
      }
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch session (${response.status}): ${errorText}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text()
        throw new Error(`Expected JSON response, got: ${responseText}`)
      }

      const data = await response.json()

      if (data.ok === false) {
        throw new Error(data.message || "Session not found")
      }

      if (data.session) {
        const sessionData = {
          session: data.session,
          questions: data.questions || [],
          userAnswers: data.userAnswers || [],
          userProgress: data.userProgress || [],
        }

        // Cache the session data for offline access
        try {
          localStorage.setItem(`session_${sessionId}_cache`, JSON.stringify(sessionData))
        } catch (cacheError) {
          console.warn('Error caching session data:', cacheError)
        }

        set({
          ...sessionData,
          loading: false,
          error: null
        })
      } else {
        throw new Error("Session not found or invalid response format")
      }
    } catch (err: any) {
      console.error("Error loading session:", err)
      
      // Try to use cached data if available
      const cachedSession = localStorage.getItem(`session_${sessionId}_cache`)
      if (cachedSession && !currentState.session) {
        try {
          const cached = JSON.parse(cachedSession)
          set({
            session: cached.session,
            questions: cached.questions || [],
            userAnswers: cached.userAnswers || [],
            userProgress: cached.userProgress || [],
            loading: false,
            error: "Using cached data - connection issues detected"
          })
          return
        } catch (cacheError) {
          console.warn('Error using cached session data:', cacheError)
        }
      }

      set({
        loading: false,
        error: err.message || "Failed to load session data"
      })
    }
  },

  // Clear all session data
  clearSession: () => {
    set({
      session: null,
      questions: [],
      userAnswers: [],
      userProgress: [],
      loading: false,
      error: null
    })
  },

  // Update user answer locally (optimistic update)
  updateAnswer: (questionId: string, answer: UserAnswer) => {
    const { userAnswers, session } = get()
    const updatedAnswers = userAnswers.filter(a => a.question_id !== questionId)
    updatedAnswers.push(answer)
    
    // Update session stats
    if (session) {
      const correctAnswers = updatedAnswers.filter(a => a.is_correct).length
      const incorrectAnswers = updatedAnswers.filter(a => !a.is_correct).length
      const currentQuestionIndex = Math.max(1, updatedAnswers.length)
      
      const updatedSession: UserSession = {
        ...session,
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        current_question_index: currentQuestionIndex
      }
      
      set({ 
        userAnswers: updatedAnswers,
        session: updatedSession
      })
      
      // Update session in database for real-time tracking
      get().updateSessionStats(session.id, correctAnswers, incorrectAnswers, currentQuestionIndex)
    } else {
      set({ userAnswers: updatedAnswers })
    }
  },

  // Update user progress locally (optimistic update)
  updateProgress: (questionId: string, progress: UserQuestionProgress) => {
    const { userProgress } = get()
    const updatedProgress = userProgress.filter(p => p.question_id !== questionId)
    updatedProgress.push(progress)
    
    set({ userProgress: updatedProgress })
  },

  // Refresh session data from API (fallback when realtime fails)
  refreshSessionData: async (sessionId: string) => {
    const { loadSession } = get()
    await loadSession(sessionId)
  },

  // Update session stats in database
  updateSessionStats: async (sessionId: string, correctAnswers: number, incorrectAnswers: number, currentQuestionIndex: number) => {
    try {
      await fetch(`/api/sessions/${sessionId}/update-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correct_answers: correctAnswers,
          incorrect_answers: incorrectAnswers,
          current_question_index: currentQuestionIndex
        })
      })
    } catch (error) {
      console.error('Error updating session stats:', error)
    }
  },

  // Real-time subscription (Phase 3)
  subscribeToSession: (sessionId: string) => {
    const supabase = createClient()
    const { session } = get()
    
    if (!session) return

    console.log('Setting up real-time subscription for session:', sessionId)

    try {
      // Subscribe to user_answers changes
      const answersSubscription = supabase
        .channel(`session-answers-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_answers',
            filter: `session_id=eq.${sessionId}`,
          },
          (payload: any) => {
            console.log('Real-time answer update:', payload)
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newAnswer = payload.new as UserAnswer
              get().updateAnswer(newAnswer.question_id, newAnswer)
            }
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to answers channel')
            set({ isRealTimeEnabled: true })
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('Failed to subscribe to answers channel, falling back to polling')
            set({ isRealTimeEnabled: false })
          }
        })

      // Subscribe to user_question_progress changes
      const progressSubscription = supabase
        .channel(`session-progress-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_question_progress',
            filter: `user_id=eq.${session.user_id}`,
          },
          (payload: any) => {
            console.log('Real-time progress update:', payload)
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newProgress = payload.new as UserQuestionProgress
              get().updateProgress(newProgress.question_id, newProgress)
            }
          }
        )
        .subscribe()

      // Store subscription references for cleanup
      ;(get() as any).subscriptions = { answersSubscription, progressSubscription }
      
      // Set up polling fallback if realtime fails
      const pollInterval = setInterval(() => {
        if (!get().isRealTimeEnabled) {
          console.log('Polling for session updates...')
          get().refreshSessionData(sessionId)
        }
      }, 10000) // Poll every 10 seconds as fallback
      
      ;(get() as any).pollInterval = pollInterval
      
    } catch (error) {
      console.error('Error setting up real-time subscription:', error)
      set({ isRealTimeEnabled: false })
      
      // Set up polling as fallback
      const pollInterval = setInterval(() => {
        get().refreshSessionData(sessionId)
      }, 5000) // Poll every 5 seconds if realtime completely fails
      
      ;(get() as any).pollInterval = pollInterval
    }
  },

  // Unsubscribe from real-time updates
  unsubscribeFromSession: () => {
    const subscriptions = (get() as any).subscriptions
    const pollInterval = (get() as any).pollInterval
    
    if (subscriptions) {
      subscriptions.answersSubscription?.unsubscribe()
      subscriptions.progressSubscription?.unsubscribe()
      ;(get() as any).subscriptions = null
    }
    
    if (pollInterval) {
      clearInterval(pollInterval)
      ;(get() as any).pollInterval = null
    }
    
    set({ isRealTimeEnabled: false })
    console.log('Unsubscribed from real-time updates and polling')
  }
}))

// Custom hook for easier session management
export const useSession = (sessionId?: string) => {
  const store = useSessionStore()
  
  // Auto-load session when sessionId changes
  React.useEffect(() => {
    if (sessionId && sessionId !== store.session?.id) {
      console.log(`Loading session: ${sessionId}`)
      store.loadSession(sessionId)
    }
  }, [sessionId, store.session?.id])
  
  // Set up real-time subscription when session is loaded
  React.useEffect(() => {
    if (sessionId && store.session && !store.loading) {
      console.log(`Setting up real-time for session: ${sessionId}`)
      store.subscribeToSession(sessionId)
    }
    
    return () => {
      // Only unsubscribe, don't clear session data
      store.unsubscribeFromSession()
    }
  }, [sessionId, store.session?.id, store.loading])
  
  return store
} 