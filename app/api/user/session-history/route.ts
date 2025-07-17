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

    // Format sessions for display with fresh dynamic time data
    const formattedSessions = []
    for (const session of sessions || []) {
      try {
        // Get fresh active time for each session
        const { data: activeTime } = await supabase.rpc('calculate_session_active_time', {
          session_id: session.id
        })
        
        const totalAnswered = (session.correct_answers || 0) + (session.incorrect_answers || 0)
        const score = totalAnswered > 0 ? ((session.correct_answers || 0) / totalAnswered) * 100 : 0
        const finalTimeSpent = activeTime || session.total_time_spent || 0
        const timeInMinutes = Math.floor(finalTimeSpent / 60)

        formattedSessions.push({
          id: session.id,
          name: session.session_name,
          type: session.session_type,
          date: session.completed_at || session.created_at,
          score: Math.round(score * 10) / 10, // Round to 1 decimal place
          totalQuestions: session.total_questions,
          correctAnswers: session.correct_answers || 0,
          incorrectAnswers: session.incorrect_answers || 0,
          timeSpent: timeInMinutes,
          isCompleted: !!session.completed_at,
        })
      } catch (error) {
        console.error(`Error calculating active time for session ${session.id}:`, error)
        // Fallback to stored time if calculation fails
        const totalAnswered = (session.correct_answers || 0) + (session.incorrect_answers || 0)
        const score = totalAnswered > 0 ? ((session.correct_answers || 0) / totalAnswered) * 100 : 0
        const timeInMinutes = Math.floor((session.total_time_spent || 0) / 60)

        formattedSessions.push({
          id: session.id,
          name: session.session_name,
          type: session.session_type,
          date: session.completed_at || session.created_at,
          score: Math.round(score * 10) / 10,
          totalQuestions: session.total_questions,
          correctAnswers: session.correct_answers || 0,
          incorrectAnswers: session.incorrect_answers || 0,
          timeSpent: timeInMinutes,
          isCompleted: !!session.completed_at,
        })
      }
    }

    return NextResponse.json({ sessions: formattedSessions })
  } catch (error) {
    console.error("Error fetching session history:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
