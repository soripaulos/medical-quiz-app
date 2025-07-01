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

    // Get completed sessions with their metrics
    const { data: sessions, error } = await supabase
      .from("user_sessions")
      .select(`
        completed_at,
        correct_answers,
        incorrect_answers
      `)
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: true })

    if (error) {
      console.error("Error fetching progress over time:", error)
      return NextResponse.json({ error: "Failed to fetch progress over time" }, { status: 500 })
    }

    // Group sessions by date and calculate daily accuracy
    const dailyProgress: { [key: string]: { correct: number; total: number; sessions: number } } = {}
    ;(sessions || []).forEach((session) => {
      const date = new Date(session.completed_at).toISOString().split("T")[0]
      const correct = session.correct_answers || 0
      const incorrect = session.incorrect_answers || 0
      const total = correct + incorrect

      if (!dailyProgress[date]) {
        dailyProgress[date] = { correct: 0, total: 0, sessions: 0 }
      }

      dailyProgress[date].correct += correct
      dailyProgress[date].total += total
      dailyProgress[date].sessions += 1
    })

    // Transform to array format
    const progress = Object.entries(dailyProgress).map(([date, stats]) => ({
      date,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      sessionsCount: stats.sessions,
    }))

    return NextResponse.json({ progress })
  } catch (error) {
    console.error("Error in progress over time API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
