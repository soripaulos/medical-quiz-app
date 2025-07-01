import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const supabase = await createClient()
    const { sessionId } = params

    // Get session with stored metrics
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select(`
        *,
        total_time_spent,
        correct_answers,
        incorrect_answers,
        unanswered_questions
      `)
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Get detailed answers for the session
    const { data: answers, error: answersError } = await supabase
      .from("user_answers")
      .select(`
        *,
        questions (
          id,
          question_text,
          choice_a,
          choice_b,
          choice_c,
          choice_d,
          choice_e,
          choice_f,
          correct_answer,
          explanation,
          specialties (name),
          exam_types (name)
        )
      `)
      .eq("session_id", sessionId)
      .order("answered_at", { ascending: true })

    if (answersError) {
      console.error("Error fetching answers:", answersError)
      return NextResponse.json({ error: "Failed to fetch answers" }, { status: 500 })
    }

    // Use stored metrics or calculate as fallback
    const correctAnswers = session.correct_answers ?? (answers || []).filter((a) => a.is_correct).length
    const incorrectAnswers = session.incorrect_answers ?? (answers || []).filter((a) => !a.is_correct).length
    const totalAnswered = correctAnswers + incorrectAnswers
    const unansweredQuestions = session.unanswered_questions ?? Math.max(0, session.total_questions - totalAnswered)

    // Convert time from seconds to minutes for display
    const totalTimeMinutes = Math.floor((session.total_time_spent || 0) / 60)

    const results = {
      session: {
        ...session,
        total_time_minutes: totalTimeMinutes,
      },
      answers: answers || [],
      summary: {
        totalQuestions: session.total_questions,
        correctAnswers,
        incorrectAnswers,
        unansweredQuestions,
        score: totalAnswered > 0 ? (correctAnswers / totalAnswered) * 100 : 0,
        totalTimeSpent: session.total_time_spent || 0, // in seconds
        totalTimeMinutes, // in minutes
      },
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error in results API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
