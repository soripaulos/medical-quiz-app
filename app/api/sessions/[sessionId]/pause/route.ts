import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { safelyPauseSession, calculateSessionMetrics } from "@/lib/session-utils"

export async function POST(req: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const supabase = await createClient()
    const { sessionId } = await context.params

    // Get current session data
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Only pause if session is active and not already paused
    if (!session.is_active || session.is_paused) {
      return NextResponse.json({ 
        success: true, 
        message: "Session is already paused or inactive" 
      })
    }

    // Use utility function to safely pause the session
    const result = await safelyPauseSession(sessionId)

    if (!result.success) {
      return NextResponse.json({ error: "Failed to pause session" }, { status: 500 })
    }

    // Calculate and update current metrics
    try {
      const metrics = await calculateSessionMetrics(sessionId)
      
      await supabase
        .from("user_sessions")
        .update({
          correct_answers: metrics.correctAnswers,
          incorrect_answers: metrics.incorrectAnswers,
          unanswered_questions: metrics.unansweredQuestions,
        })
        .eq("id", sessionId)
    } catch (error) {
      console.error("Error updating session metrics:", error)
      // Don't fail the request - the session was paused successfully
    }

    // Clear active session from user profile to prevent stubborn popups
    try {
      await supabase
        .from("profiles")
        .update({ active_session_id: null })
        .eq("id", session.user_id)
    } catch (error) {
      console.error("Error clearing active session from profile:", error)
      // Don't fail the request - the session was paused successfully
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error pausing session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
