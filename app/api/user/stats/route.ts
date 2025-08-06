import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/auth"

export async function GET() {
  try {
    // Get current user using DAL
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user sessions with stored metrics
    const { data: sessions, error: sessionsError } = await supabase
      .from("user_sessions")
      .select(`
        id,
        session_name,
        session_type,
        total_questions,
        total_active_time,
        correct_answers,
        incorrect_answers,
        unanswered_questions,
        completed_at,
        created_at,
        is_active
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
    
    // Note: latestCorrectCount and latestIncorrectCount will be calculated after latestAnswerMap is created
    
    // Calculate total time spent using total_active_time for completed sessions and real-time for active ones
    let totalTimeSpentSeconds = 0
    console.log(`Processing ${sessions?.length || 0} sessions for time calculation`)
    for (const session of sessions || []) {
      try {
        if (session.is_active) {
          // For active sessions, get real-time calculation
          const { data: activeTime } = await supabase.rpc('calculate_session_active_time', {
            session_id: session.id
          })
          const timeToAdd = activeTime || session.total_active_time || 0
          console.log(`Active session ${session.id}: adding ${timeToAdd} seconds`)
          totalTimeSpentSeconds += timeToAdd
        } else {
          // For completed sessions, use stored total_active_time
          const timeToAdd = session.total_active_time || 0
          console.log(`Completed session ${session.id}: adding ${timeToAdd} seconds`)
          totalTimeSpentSeconds += timeToAdd
        }
      } catch (error) {
        console.error(`Error calculating active time for session ${session.id}:`, error)
        const timeToAdd = session.total_active_time || 0
        console.log(`Fallback for session ${session.id}: adding ${timeToAdd} seconds`)
        totalTimeSpentSeconds += timeToAdd
      }
    }
    console.log(`Total time spent: ${totalTimeSpentSeconds} seconds (${Math.floor(totalTimeSpentSeconds / 60)} minutes)`)

    // Get latest answers per question for answer distribution (not across all sessions)
    const { data: latestAnswers, error: answersError } = await supabase
      .from("user_answers")
      .select("question_id, is_correct, answered_at")
      .eq("user_id", user.id)
      .order("answered_at", { ascending: false })

    if (answersError) {
      console.error("Latest answers error:", answersError)
    }

    // Create map of question_id to most recent answer
    const latestAnswerMap = new Map<string, { is_correct: boolean; answered_at: string }>()
    latestAnswers?.forEach((answer) => {
      if (!latestAnswerMap.has(answer.question_id)) {
        latestAnswerMap.set(answer.question_id, {
          is_correct: answer.is_correct,
          answered_at: answer.answered_at,
        })
      }
    })

    // Get total questions in database for distribution calculation
    const { data: allQuestions, error: allQuestionsError } = await supabase
      .from("questions")
      .select("id")

    if (allQuestionsError) {
      console.error("All questions error:", allQuestionsError)
    }

    const totalQuestionsInDatabase = allQuestions?.length || 0
    
    // Calculate answer distribution based on latest answers per question
    let latestCorrectCount = 0
    let latestIncorrectCount = 0
    
    latestAnswerMap.forEach((answer) => {
      if (answer.is_correct) {
        latestCorrectCount++
      } else {
        latestIncorrectCount++
      }
    })

    const totalAnsweredQuestions = latestAnswerMap.size
    const unansweredCount = totalQuestionsInDatabase - totalAnsweredQuestions

    const correctPercentage = totalQuestionsInDatabase > 0 ? (latestCorrectCount / totalQuestionsInDatabase) * 100 : 0
    const incorrectPercentage = totalQuestionsInDatabase > 0 ? (latestIncorrectCount / totalQuestionsInDatabase) * 100 : 0
    const unansweredPercentage = totalQuestionsInDatabase > 0 ? (unansweredCount / totalQuestionsInDatabase) * 100 : 0

    // Calculate overall score as correct answers out of attempted answers (excluding unanswered)
    // Use the same logic as question filters - latest answer per question
    const totalAttemptedQuestions = latestCorrectCount + latestIncorrectCount
    const overallScore = totalAttemptedQuestions > 0 ? (latestCorrectCount / totalAttemptedQuestions) * 100 : 0

    const stats = {
      totalSessions,
      totalQuestions,
      totalCorrect: latestCorrectCount, // Use latest answers per question
      totalIncorrect: latestIncorrectCount, // Use latest answers per question
      totalTimeSpent: totalTimeSpentSeconds, // Return in seconds for proper conversion
      averageScore: overallScore, // Now calculated as correct/(correct + incorrect) using latest answers
      totalAttemptedQuestions, // Add this for display
      totalUniqueQuestions: totalAnsweredQuestions,
      answerDistribution: {
        correct: correctPercentage,
        incorrect: incorrectPercentage,
        unanswered: unansweredPercentage,
      },
      // Additional stats for better insights
      latestAnswerStats: {
        correct: latestCorrectCount,
        incorrect: latestIncorrectCount,
        unanswered: unansweredCount,
        total: totalQuestionsInDatabase,
      },
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
