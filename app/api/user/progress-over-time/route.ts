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

    // Get completed sessions with stored metrics, ordered by completion date
    const { data: sessions, error: sessionsError } = await supabase
      .from("user_sessions")
      .select(`
        id,
        session_name,
        total_questions,
        correct_answers,
        incorrect_answers,
        completed_at
      `)
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: true })

    if (sessionsError) {
      console.error("Sessions error:", sessionsError)
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
    }

    // Calculate cumulative progress over time
    let cumulativeCorrect = 0
    let cumulativeTotal = 0

    const progressData =
      sessions?.map((session, index) => {
        const sessionCorrect = session.correct_answers || 0
        const sessionTotal = (session.correct_answers || 0) + (session.incorrect_answers || 0)

        cumulativeCorrect += sessionCorrect
        cumulativeTotal += sessionTotal

        const sessionAccuracy = sessionTotal > 0 ? (sessionCorrect / sessionTotal) * 100 : 0
        const cumulativeAccuracy = cumulativeTotal > 0 ? (cumulativeCorrect / cumulativeTotal) * 100 : 0

        return {
          sessionNumber: index + 1,
          sessionName: session.session_name,
          date: session.completed_at,
          sessionAccuracy: Math.round(sessionAccuracy * 10) / 10,
          cumulativeAccuracy: Math.round(cumulativeAccuracy * 10) / 10,
          questionsAnswered: sessionTotal,
          totalQuestionsAnswered: cumulativeTotal,
        }
      }) || []

    return NextResponse.json({ progressData })
  } catch (error) {
    console.error("Error fetching progress over time:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
