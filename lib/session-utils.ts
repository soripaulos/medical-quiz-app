import { createClient } from "@/lib/supabase/server"

export interface SessionMetrics {
  correctAnswers: number
  incorrectAnswers: number
  unansweredQuestions: number
  totalTimeSpent: number
}

/**
 * Calculate session metrics based on user answers
 */
export async function calculateSessionMetrics(sessionId: string): Promise<SessionMetrics> {
  const supabase = await createClient()
  
  // Get session data
  const { data: session } = await supabase
    .from("user_sessions")
    .select("total_questions")
    .eq("id", sessionId)
    .single()

  // Get answers for this session
  const { data: answers } = await supabase
    .from("user_answers")
    .select("is_correct")
    .eq("session_id", sessionId)

  const correctAnswers = answers?.filter((a) => a.is_correct).length || 0
  const incorrectAnswers = answers?.filter((a) => !a.is_correct).length || 0
  const totalAnswered = correctAnswers + incorrectAnswers
  const unansweredQuestions = Math.max(0, (session?.total_questions || 0) - totalAnswered)

  return {
    correctAnswers,
    incorrectAnswers,
    unansweredQuestions,
    totalTimeSpent: 0, // Will be calculated separately
  }
}

/**
 * Safely pause a session with fallback mechanisms
 */
export async function safelyPauseSession(sessionId: string): Promise<{ success: boolean; timeSpent?: number }> {
  const supabase = await createClient()
  
  try {
    // First, try to pause using the database function
    const { data: pauseResult, error: pauseError } = await supabase.rpc('pause_session_activity', {
      session_id: sessionId
    })

    if (!pauseError) {
      return { success: true }
    }

    console.error("Database function failed, using fallback:", pauseError)
    
    // Fallback: manually update session state
    const { error: fallbackError } = await supabase
      .from("user_sessions")
      .update({
        is_paused: true,
        session_paused_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    if (fallbackError) {
      console.error("Fallback pause failed:", fallbackError)
      return { success: false }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in safelyPauseSession:", error)
    return { success: false }
  }
}

/**
 * Safely end a session with fallback mechanisms
 */
export async function safelyEndSession(sessionId: string): Promise<{ success: boolean; metrics?: SessionMetrics }> {
  const supabase = await createClient()
  
  try {
    // Calculate metrics first
    const metrics = await calculateSessionMetrics(sessionId)
    
    // Try to end using the database function
    const { data: finalActiveTime, error: endError } = await supabase.rpc('end_session_activity', {
      session_id: sessionId
    })

    if (!endError) {
      // Update session with metrics
      await supabase
        .from("user_sessions")
        .update({
          correct_answers: metrics.correctAnswers,
          incorrect_answers: metrics.incorrectAnswers,
          unanswered_questions: metrics.unansweredQuestions,
        })
        .eq("id", sessionId)

      return { 
        success: true, 
        metrics: { ...metrics, totalTimeSpent: finalActiveTime || 0 } 
      }
    }

    console.error("Database function failed, using fallback:", endError)
    
    // Fallback: manually end session
    const { data: session } = await supabase
      .from("user_sessions")
      .select("total_active_time")
      .eq("id", sessionId)
      .single()

    const fallbackTime = session?.total_active_time || 0

    const { error: fallbackError } = await supabase
      .from("user_sessions")
      .update({
        total_active_time: fallbackTime,
        correct_answers: metrics.correctAnswers,
        incorrect_answers: metrics.incorrectAnswers,
        unanswered_questions: metrics.unansweredQuestions,
        completed_at: new Date().toISOString(),
        is_active: false,
        is_paused: false,
      })
      .eq("id", sessionId)

    if (fallbackError) {
      console.error("Fallback end failed:", fallbackError)
      return { success: false }
    }

    return { 
      success: true, 
      metrics: { ...metrics, totalTimeSpent: fallbackTime } 
    }
  } catch (error) {
    console.error("Error in safelyEndSession:", error)
    return { success: false }
  }
}

/**
 * Clean up orphaned sessions (sessions that were not properly closed)
 * Made less aggressive to preserve active sessions
 */
export async function cleanupOrphanedSessions(userId: string): Promise<void> {
  const supabase = await createClient()
  
  try {
    // Find sessions that are active but haven't been updated in a very long time (24 hours - much more lenient)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: orphanedSessions } = await supabase
      .from("user_sessions")
      .select("id, session_name, last_activity_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .lt("last_activity_at", twentyFourHoursAgo)

    if (orphanedSessions && orphanedSessions.length > 0) {
      console.log(`Found ${orphanedSessions.length} potentially orphaned sessions for user ${userId}`)
      
      // End each orphaned session, but only if it's really, really old
      for (const session of orphanedSessions) {
        const lastActivity = new Date(session.last_activity_at)
        const now = new Date()
        const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
        
        // Only cleanup sessions that have been inactive for more than 24 hours
        if (hoursSinceActivity > 24) {
          console.log(`Cleaning up session ${session.id} (${session.session_name}) - inactive for ${hoursSinceActivity.toFixed(1)} hours`)
          await safelyEndSession(session.id)
        } else {
          console.log(`Preserving session ${session.id} (${session.session_name}) - inactive for only ${hoursSinceActivity.toFixed(1)} hours`)
        }
      }
    }
  } catch (error) {
    console.error("Error cleaning up orphaned sessions:", error)
  }
}

/**
 * Get accurate session time using the database function
 */
export async function getSessionActiveTime(sessionId: string): Promise<number> {
  const supabase = await createClient()
  
  try {
    const { data: activeTime, error } = await supabase.rpc('calculate_session_active_time', {
      session_id: sessionId
    })

    if (error) {
      console.error("Error calculating active time:", error)
      // Fallback to stored time
      const { data: session } = await supabase
        .from("user_sessions")
        .select("total_active_time")
        .eq("id", sessionId)
        .single()
      
      return session?.total_active_time || 0
    }

    return activeTime || 0
  } catch (error) {
    console.error("Error in getSessionActiveTime:", error)
    return 0
  }
}