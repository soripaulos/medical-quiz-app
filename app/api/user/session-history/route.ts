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

    // Fetch sessions with stored metrics
    const { data: sessions, error } = await supabase
      .from("user_sessions")
      .select(`
        id,
        session_name,
        session_type,
        completed_at,
        total_questions,
        correct_answers,
        incorrect_answers,
        total_time_spent,
        created_at
      `)
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })

    if (error) {
      console.error("Error fetching session history:", error)
      return NextResponse.json({ error: "Failed to fetch session history" }, { status: 500 })
    }

    // Transform sessions to include calculated metrics using stored data
    const sessionsWithScores = (sessions || []).map((session) => {
      const correctAnswers = session.correct_answers || 0
      const totalAnswered = (session.correct_answers || 0) + (session.incorrect_answers || 0)
      const score = totalAnswered > 0 ? (correctAnswers / totalAnswered) * 100 : 0

      // Convert time from seconds to minutes
      const timeSpentMinutes = Math.floor((session.total_time_spent || 0) / 60)

      return {
        ...session,
        score,
        correct_answers: correctAnswers,
        time_spent: timeSpentMinutes, // Now in minutes
      }
    })

    return NextResponse.json({ sessions: sessionsWithScores })
  } catch (error) {
    console.error("Error in session history API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
