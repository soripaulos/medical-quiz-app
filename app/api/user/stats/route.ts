import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user sessions with stored metrics
    const { data: sessions, error: sessionsError } = await supabase
      .from("user_sessions")
      .select(`
        id,
        session_name,
        session_type,
        total_questions,
        total_time_spent,
        correct_answers,
        incorrect_answers,
        unanswered_questions,
        completed_at,
        created_at
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (sessionsError) {
      console.error("Sessions error:", sessionsError)
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
    }

    // Calculate aggregate stats from stored session metrics
    const completedSessions = sessions?.filter((s) => s.completed_at) || []

    const totalSessions = completedSessions.length
    const totalQuestions = completedSessions.reduce((sum, s) => sum + (s.total_questions || 0), 0)
    const totalCorrect = completedSessions.reduce((sum, s) => sum + (s.correct_answers || 0), 0)
    const totalIncorrect = completedSessions.reduce((sum, s) => sum + (s.incorrect_answers || 0), 0)
    const totalTimeSpentSeconds = completedSessions.reduce((sum, s) => sum + (s.total_time_spent || 0), 0)

    // Get total unique questions attempted across all sessions
    const { data: uniqueQuestions, error: uniqueError } = await supabase
      .from("user_answers")
      .select("question_id")
      .eq("user_id", user.id)

    if (uniqueError) {
      console.error("Unique questions error:", uniqueError)
    }

    const uniqueQuestionIds = new Set(uniqueQuestions?.map((q) => q.question_id) || [])
    const totalUniqueQuestions = uniqueQuestionIds.size

    // Calculate answer distribution based on all questions encountered
    const { data: allQuestions, error: allQuestionsError } = await supabase.from("questions").select("id")

    if (allQuestionsError) {
      console.error("All questions error:", allQuestionsError)
    }

    const totalQuestionsInDatabase = allQuestions?.length || 0
    const correctPercentage = totalQuestionsInDatabase > 0 ? (totalCorrect / totalQuestionsInDatabase) * 100 : 0
    const incorrectPercentage = totalQuestionsInDatabase > 0 ? (totalIncorrect / totalQuestionsInDatabase) * 100 : 0
    const unansweredPercentage =
      totalQuestionsInDatabase > 0
        ? ((totalQuestionsInDatabase - totalUniqueQuestions) / totalQuestionsInDatabase) * 100
        : 0

    const stats = {
      totalSessions,
      totalQuestions,
      totalCorrect,
      totalIncorrect,
      totalTimeSpent: totalTimeSpentSeconds, // Return in seconds for proper conversion
      averageScore: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
      totalUniqueQuestions,
      answerDistribution: {
        correct: correctPercentage,
        incorrect: incorrectPercentage,
        unanswered: unansweredPercentage,
      },
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
