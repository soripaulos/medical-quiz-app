import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifySession } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const userSession = await verifySession()
    
    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user sessions with stored metrics
    const { data: sessions, error: sessionsError } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", userSession.user.id)

    if (sessionsError) {
      console.error("Sessions error:", sessionsError)
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
    }

    // Get user progress data
    const { data: userProgress, error: progressError } = await supabase
      .from("user_question_progress")
      .select("*")
      .eq("user_id", userSession.user.id)

    if (progressError) {
      console.error("Progress error:", progressError)
    }

    // Calculate aggregate stats from stored session metrics
    const completedSessions = sessions?.filter((s: any) => s.completed_at) || []
    const totalSessions = completedSessions.length
    const totalQuestions = completedSessions.reduce((sum: number, s: any) => sum + (s.total_questions || 0), 0)
    const totalCorrect = completedSessions.reduce((sum: number, s: any) => sum + (s.correct_answers || 0), 0)
    const totalIncorrect = completedSessions.reduce((sum: number, s: any) => sum + (s.incorrect_answers || 0), 0)
    const totalAnswered = totalCorrect + totalIncorrect
    const totalUnanswered = totalQuestions - totalAnswered

    // Calculate averages
    const averageAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
    const averageSessionScore = totalSessions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

    // Time statistics from sessions
    const totalTimeSpent = completedSessions.reduce((sum: number, s: any) => sum + (s.active_time_seconds || 0), 0)
    const averageSessionTime = totalSessions > 0 ? Math.round(totalTimeSpent / totalSessions) : 0
    const averageTimePerQuestion = totalAnswered > 0 ? Math.round(totalTimeSpent / totalAnswered) : 0

    // Progress statistics
    const flaggedQuestions = userProgress?.filter((p: any) => p.is_flagged).length || 0
    const reviewedQuestions = userProgress?.length || 0

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentSessions = completedSessions.filter((s: any) => 
      new Date(s.completed_at) > sevenDaysAgo
    )
    const recentQuestionsAnswered = recentSessions.reduce((sum: number, s: any) => 
      sum + ((s.correct_answers || 0) + (s.incorrect_answers || 0)), 0
    )

    // Performance trends
    const last5Sessions = completedSessions.slice(-5)
    const recentAccuracy = last5Sessions.length > 0 
      ? Math.round((last5Sessions.reduce((sum: number, s: any) => sum + (s.correct_answers || 0), 0) / 
          last5Sessions.reduce((sum: number, s: any) => sum + ((s.correct_answers || 0) + (s.incorrect_answers || 0)), 0)) * 100)
      : 0

    // Streak calculation (consecutive days with activity)
    let currentStreak = 0
    const today = new Date()
    let checkDate = new Date(today)
    
    while (currentStreak < 365) { // Max 365 days to prevent infinite loop
      const dayStart = new Date(checkDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(checkDate)
      dayEnd.setHours(23, 59, 59, 999)
      
      const hasActivity = completedSessions.some((s: any) => {
        const sessionDate = new Date(s.completed_at)
        return sessionDate >= dayStart && sessionDate <= dayEnd
      })
      
      if (hasActivity) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    const stats = {
      totalSessions,
      totalQuestions,
      totalCorrect,
      totalIncorrect,
      totalUnanswered,
      averageAccuracy,
      averageSessionScore,
      totalTimeSpent,
      averageSessionTime,
      averageTimePerQuestion,
      flaggedQuestions,
      reviewedQuestions,
      recentQuestionsAnswered,
      recentAccuracy,
      currentStreak,
      lastActivity: completedSessions.length > 0 
        ? completedSessions[completedSessions.length - 1].completed_at 
        : null
    }

    return NextResponse.json({ stats })

  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
