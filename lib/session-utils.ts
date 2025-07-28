import { createClient } from "@/lib/supabase/server"

export interface SessionMetrics {
  correctAnswers: number
  incorrectAnswers: number
  totalAnswered: number
  unansweredQuestions: number
  accuracy: number
}

export async function calculateSessionMetrics(sessionId: string): Promise<SessionMetrics | null> {
  try {
    const supabase = await createClient()

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("total_questions")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      console.error("Session error:", sessionError)
      return null
    }

    // Get answers for this session
    const { data: answers, error: answersError } = await supabase
      .from("user_answers")
      .select("is_correct")
      .eq("session_id", sessionId)

    const correctAnswers = answers?.filter((a: any) => a.is_correct).length || 0
    const incorrectAnswers = answers?.filter((a: any) => !a.is_correct).length || 0
    const totalAnswered = correctAnswers + incorrectAnswers
    const unansweredQuestions = Math.max(0, (session?.total_questions || 0) - totalAnswered)

    return {
      correctAnswers,
      incorrectAnswers,
      totalAnswered,
      unansweredQuestions,
      accuracy: totalAnswered > 0 ? (correctAnswers / totalAnswered) * 100 : 0,
    }
  } catch (error) {
    console.error("Error calculating session metrics:", error)
    return null
  }
}

export async function updateSessionMetrics(sessionId: string): Promise<boolean> {
  try {
    const metrics = await calculateSessionMetrics(sessionId)
    if (!metrics) return false

    const supabase = await createClient()

    const { error } = await supabase
      .from("user_sessions")
      .update({
        correct_answers: metrics.correctAnswers,
        incorrect_answers: metrics.incorrectAnswers,
        unanswered_questions: metrics.unansweredQuestions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    if (error) {
      console.error("Error updating session metrics:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateSessionMetrics:", error)
    return false
  }
}

export async function completeSession(sessionId: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    // First update the metrics
    const updated = await updateSessionMetrics(sessionId)
    if (!updated) return false

    // Calculate final active time
    const { data: activeTime, error: timeError } = await supabase.rpc('calculate_session_active_time', {
      session_id: sessionId
    })

    if (timeError) {
      console.error("Error calculating final active time:", timeError)
    }

    // Mark session as completed
    const { error } = await supabase
      .from("user_sessions")
      .update({
        is_completed: true,
        is_active: false,
        completed_at: new Date().toISOString(),
        active_time_seconds: activeTime || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    if (error) {
      console.error("Error completing session:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in completeSession:", error)
    return false
  }
}

export async function pauseSession(sessionId: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("user_sessions")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    if (error) {
      console.error("Error pausing session:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in pauseSession:", error)
    return false
  }
}

export async function resumeSession(sessionId: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("user_sessions")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    if (error) {
      console.error("Error resuming session:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in resumeSession:", error)
    return false
  }
}

export async function getActiveSession(userId: string): Promise<any | null> {
  try {
    const supabase = await createClient()

    const { data: session, error } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("is_completed", false)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No active session found
        return null
      }
      console.error("Error getting active session:", error)
      return null
    }

    return session
  } catch (error) {
    console.error("Error in getActiveSession:", error)
    return null
  }
}

export async function cleanupInactiveSessions(): Promise<number> {
  try {
    const supabase = await createClient()

    // Sessions inactive for more than 24 hours should be marked as completed
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - 24)

    const { data: inactiveSessions, error: fetchError } = await supabase
      .from("user_sessions")
      .select("id")
      .eq("is_active", true)
      .eq("is_completed", false)
      .lt("updated_at", cutoffTime.toISOString())

    if (fetchError) {
      console.error("Error fetching inactive sessions:", fetchError)
      return 0
    }

    if (!inactiveSessions || inactiveSessions.length === 0) {
      return 0
    }

    // Complete each inactive session
    let completedCount = 0
    for (const session of inactiveSessions) {
      const completed = await completeSession(session.id)
      if (completed) {
        completedCount++
      }
    }

    return completedCount
  } catch (error) {
    console.error("Error in cleanupInactiveSessions:", error)
    return 0
  }
}

export async function getSessionProgress(sessionId: string): Promise<{
  totalQuestions: number
  answeredQuestions: number
  currentQuestionIndex: number
  progressPercentage: number
} | null> {
  try {
    const supabase = await createClient()

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("total_questions")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return null
    }

    // Get answered questions count
    const { data: answers, error: answersError } = await supabase
      .from("user_answers")
      .select("id")
      .eq("session_id", sessionId)

    if (answersError) {
      console.error("Error getting answers:", answersError)
      return null
    }

    const totalQuestions = session.total_questions || 0
    const answeredQuestions = answers?.length || 0
    const currentQuestionIndex = Math.min(answeredQuestions, totalQuestions - 1)
    const progressPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0

    return {
      totalQuestions,
      answeredQuestions,
      currentQuestionIndex,
      progressPercentage,
    }
  } catch (error) {
    console.error("Error in getSessionProgress:", error)
    return null
  }
}