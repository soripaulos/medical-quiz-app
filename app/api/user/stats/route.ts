import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get session statistics using stored metrics
    const { data: sessions, error: sessionsError } = await supabase
      .from("user_sessions")
      .select(`
        id,
        session_type,
        completed_at,
        total_questions,
        correct_answers,
        incorrect_answers,
        total_time_spent
      `)
      .eq("user_id", userId)

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError)
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
    }

    const completedSessions = (sessions || []).filter((s) => s.completed_at)
    const totalSessions = sessions?.length || 0

    // Aggregate metrics from stored session data
    const totalCorrectAnswers = completedSessions.reduce((sum, s) => sum + (s.correct_answers || 0), 0)
    const totalIncorrectAnswers = completedSessions.reduce((sum, s) => sum + (s.incorrect_answers || 0), 0)
    const totalTimeSpentSeconds = completedSessions.reduce((sum, s) => sum + (s.total_time_spent || 0), 0)
    const totalQuestionsAnswered = totalCorrectAnswers + totalIncorrectAnswers

    // Calculate average score
    const sessionScores = completedSessions.map((session) => {
      const correct = session.correct_answers || 0
      const total = (session.correct_answers || 0) + (session.incorrect_answers || 0)
      return total > 0 ? (correct / total) * 100 : 0
    })
    const averageScore =
      sessionScores.length > 0 ? sessionScores.reduce((sum, score) => sum + score, 0) / sessionScores.length : 0

    // Get notes count
    const { count: notesCount } = await supabase
      .from("user_notes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)

    const stats = {
      totalSessions,
      completedSessions: completedSessions.length,
      averageScore,
      totalQuestions: totalQuestionsAnswered,
      correctAnswers: totalCorrectAnswers,
      incorrectAnswers: totalIncorrectAnswers,
      unansweredQuestions: 0, // This will be calculated differently in the dashboard
      totalTimeSpent: totalTimeSpentSeconds, // Keep in seconds for dashboard calculation
      averageTimePerQuestion:
        totalQuestionsAnswered > 0 ? Math.floor(totalTimeSpentSeconds / totalQuestionsAnswered) : 0,
      totalNotes: notesCount || 0,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error in user stats API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
