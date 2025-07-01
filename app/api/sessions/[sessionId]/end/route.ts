import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const supabase = await createClient()
    const { sessionId } = params

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

    // Calculate time spent
    let totalTimeSpent = 0
    if (session.time_limit && session.time_remaining !== null) {
      // Timed session: time_limit (minutes) * 60 - time_remaining (seconds)
      totalTimeSpent = session.time_limit * 60 - session.time_remaining
    } else {
      // Untimed session: calculate elapsed time from creation to now
      const startTime = new Date(session.created_at).getTime()
      const endTime = new Date().getTime()
      totalTimeSpent = Math.floor((endTime - startTime) / 1000)
    }

    // Update session with completion data and metrics
    const { error: updateError } = await supabase
      .from("user_sessions")
      .update({
        is_active: false,
        is_paused: false,
        completed_at: new Date().toISOString(),
        total_time_spent: totalTimeSpent,
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        unanswered_questions: unansweredQuestions,
      })
      .eq("id", sessionId)

    if (updateError) {
      console.error("Error updating session:", updateError)
      return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      metrics: {
        correctAnswers,
        incorrectAnswers,
        unansweredQuestions,
        totalTimeSpent,
      },
    })
  } catch (error) {
    console.error("Error ending session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
