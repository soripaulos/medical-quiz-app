import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

    // Calculate metrics
    const { data: answers } = await supabase.from("user_answers").select("is_correct").eq("session_id", sessionId)

    const correctAnswers = answers?.filter((a) => a.is_correct).length || 0
    const incorrectAnswers = answers?.filter((a) => !a.is_correct).length || 0
    const totalAnswered = correctAnswers + incorrectAnswers
    const unansweredQuestions = Math.max(0, session.total_questions - totalAnswered)

    // End session activity tracking using the database function
    const { data: finalActiveTime, error: endError } = await supabase.rpc('end_session_activity', {
      session_id: sessionId
    })

    if (endError) {
      console.error("Error ending session activity:", endError)
      return NextResponse.json({ error: "Failed to end session" }, { status: 500 })
    }

    // Update session with completion metrics
    const { error: updateError } = await supabase
      .from("user_sessions")
      .update({
        total_time_spent: finalActiveTime,
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        unanswered_questions: unansweredQuestions,
      })
      .eq("id", sessionId)

    if (updateError) {
      console.error("Error updating session:", updateError)
      return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
    }

    // Clear the active_session_id from user's profile since session is now completed
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ active_session_id: null })
      .eq("id", session.user_id)

    if (profileError) {
      console.error("Error clearing active session:", profileError)
      // Don't fail the request - the session was ended successfully
    }

    return NextResponse.json({
      success: true,
      metrics: {
        correctAnswers,
        incorrectAnswers,
        unansweredQuestions,
        totalTimeSpent: finalActiveTime,
      },
    })
  } catch (error) {
    console.error("Error ending session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
