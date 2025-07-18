import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { safelyEndSession } from "@/lib/session-utils"

export async function POST(req: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const supabase = await createClient()
    const { sessionId } = await context.params

    // Get current session data
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Use the utility function to safely end the session
    const result = await safelyEndSession(sessionId)

    if (!result.success) {
      return NextResponse.json({ error: "Failed to end session" }, { status: 500 })
    }

    // Clear the active_session_id from user's profile since session is now completed
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ active_session_id: null })
      .eq("id", session.user_id)

    if (profileError) {
      console.error("Error clearing active session:", profileError)
      // Don't fail the request - the session was ended successfully
    }

    return NextResponse.json({
      success: true,
      metrics: result.metrics || {
        correctAnswers: 0,
        incorrectAnswers: 0,
        unansweredQuestions: 0,
        totalTimeSpent: 0,
      },
    })
  } catch (error) {
    console.error("Error ending session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
