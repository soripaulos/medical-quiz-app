import { create } from 'zustand'
import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { UserSession, Question, UserAnswer, UserQuestionProgress } from '@/lib/types'

interface SessionState {
  session: UserSession | null
  questions: Question[]
  userAnswers: UserAnswer[]
  userProgress: UserQuestionProgress[]
  loading: boolean
  error: string | null
  fetchSessionData: (sessionId: string) => Promise<void>
  setSession: (session: UserSession) => void
  initializeRealtime: (sessionId: string) => () => void
}

const supabase = createClient()

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  questions: [],
  userAnswers: [],
  userProgress: [],
  loading: true,
  error: null,
  setSession: (session) => set({ session }),
  fetchSessionData: async (sessionId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch session: ${errorText}`)
      }
      const data = await response.json()
      if (data.session) {
        set({
          session: data.session,
          questions: data.questions,
          userAnswers: data.userAnswers || [],
          userProgress: data.userProgress || [],
          loading: false,
        })
      } else {
        throw new Error('Session not found or invalid response format')
      }
    } catch (err: any) {
      console.error('Error fetching session data:', err)
      set({ error: err.message || 'Failed to load session data', loading: false })
    }
  },
  initializeRealtime: (sessionId: string) => {
    const handleAnswerUpdate = (payload: any) => {
      const newAnswer = payload.new as UserAnswer
      set((state) => ({
        userAnswers: [
          ...state.userAnswers.filter((a) => a.question_id !== newAnswer.question_id),
          newAnswer,
        ],
      }))
    }

    const handleProgressUpdate = (payload: any) => {
      const newProgress = payload.new as UserQuestionProgress
      set((state) => ({
        userProgress: [
          ...state.userProgress.filter((p) => p.question_id !== newProgress.question_id),
          newProgress,
        ],
      }))
    }

    const answersChannel = supabase
      .channel(`session-answers:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_answers', filter: `session_id=eq.${sessionId}` },
        handleAnswerUpdate
      )
      .subscribe()

    const progressChannel = supabase
      .channel(`session-progress:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_question_progress', filter: `session_id=eq.${sessionId}` },
        handleProgressUpdate
      )
      .subscribe()

    // Cleanup function
    return () => {
      supabase.removeChannel(answersChannel)
      supabase.removeChannel(progressChannel)
    }
  },
})) 