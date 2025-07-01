import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const supabase = await createClient()
    const { sessionId } = params
    const { timeRemaining } = await request.json()

    // Get current session data
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Calculate current metrics
    const { data: answers } = await supabase.from("user_answers").select("is_correct").eq("session_id", sessionId)

    const correctAnswers = (answers || []).filter((a) => a.is_correct).length
    const incorrectAnswers = (answers || []).filter((a) => !a.is_correct).length
    const totalAnswered = correctAnswers + incorrectAnswers
    const unansweredQuestions = Math.max(0, session.total_questions - totalAnswered)

    // Calculate total time spent in seconds
    const now = new Date()
    const createdAt = new Date(session.created_at)
    const totalTimeSpentSeconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000)

    // Update session with pause state and current metrics
    const { error: updateError } = await supabase
      .from("user_sessions")
      .update({
        is_paused: true,
        time_remaining: timeRemaining,
        total_time_spent: totalTimeSpentSeconds,
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        unanswered_questions: unansweredQuestions,
      })
      .eq("id", sessionId)

    if (updateError) {
      console.error("Error pausing session:", updateError)
      return NextResponse.json({ error: "Failed to pause session" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      metrics: {
        totalTimeSpent: totalTimeSpentSeconds,
        correctAnswers,
        incorrectAnswers,
        unansweredQuestions,
      },
    })
  } catch (error) {
    console.error("Error in pause session API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
