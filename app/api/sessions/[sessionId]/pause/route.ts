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

    // Calculate current metrics for paused session
    const { data: answers } = await supabase.from("user_answers").select("is_correct").eq("session_id", sessionId)

    const correctAnswers = answers?.filter((a) => a.is_correct).length || 0
    const incorrectAnswers = answers?.filter((a) => !a.is_correct).length || 0
    const totalAnswered = correctAnswers + incorrectAnswers
    const unansweredQuestions = Math.max(0, session.total_questions - totalAnswered)

    // Pause session activity tracking using the database function
    const { error: pauseError } = await supabase.rpc('pause_session_activity', {
      session_id: sessionId
    })

    if (pauseError) {
      console.error("Error pausing session activity:", pauseError)
      return NextResponse.json({ error: "Failed to pause session" }, { status: 500 })
    }

    // Update session with current metrics
    const { error: updateError } = await supabase
      .from("user_sessions")
      .update({
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        unanswered_questions: unansweredQuestions,
      })
      .eq("id", sessionId)

    if (updateError) {
      console.error("Error pausing session:", updateError)
      return NextResponse.json({ error: "Failed to pause session" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error pausing session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
