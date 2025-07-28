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
    
    // Get user sessions with performance data
    const { data: sessions, error } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", userSession.user.id)
      .eq("is_completed", true)
      .order("completed_at", { ascending: true })
      .limit(50) // Limit to last 50 sessions for performance

    if (error) {
      console.error("Error fetching sessions:", error)
      return NextResponse.json({ error: "Failed to fetch progress data" }, { status: 500 })
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        progressData: [],
        totalSessions: 0,
        averageScore: 0,
        trend: "stable"
      })
    }

    const progressData =
      sessions?.map((session: any, index: number) => {
        const sessionCorrect = session.correct_answers || 0
        const sessionTotal = (session.correct_answers || 0) + (session.incorrect_answers || 0)

        return {
          sessionNumber: index + 1,
          date: session.completed_at,
          score: sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0,
          correct: sessionCorrect,
          total: sessionTotal,
          sessionName: session.session_name,
          timeSpent: session.active_time_seconds || 0,
        }
      }) || []

    // Calculate trend (comparing first half vs second half)
    const midpoint = Math.floor(progressData.length / 2)
    const firstHalfAvg = progressData.slice(0, midpoint).reduce((sum: number, session: any) => sum + session.score, 0) / midpoint || 0
    const secondHalfAvg = progressData.slice(midpoint).reduce((sum: number, session: any) => sum + session.score, 0) / (progressData.length - midpoint) || 0
    
    let trend = "stable"
    if (secondHalfAvg > firstHalfAvg + 5) {
      trend = "improving"
    } else if (secondHalfAvg < firstHalfAvg - 5) {
      trend = "declining"
    }

    const averageScore = progressData.reduce((sum: number, session: any) => sum + session.score, 0) / progressData.length || 0

    return NextResponse.json({
      progressData,
      totalSessions: sessions.length,
      averageScore: Math.round(averageScore),
      trend
    })

  } catch (error) {
    console.error("Error in progress-over-time:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
