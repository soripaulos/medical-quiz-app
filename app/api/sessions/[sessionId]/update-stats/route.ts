import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifySession } from "@/lib/auth"

export async function POST(req: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    // Authenticate user first
    const userSession = await verifySession()
    
    if (!userSession) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const { sessionId } = await context.params
    const { correct_answers, incorrect_answers, current_question_index } = await req.json()
    
    // Update session stats
    const { error } = await supabase
      .from("user_sessions")
      .update({
        correct_answers,
        incorrect_answers,
        current_question_index,
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId)
      .eq("user_id", userSession.user.id) // Ensure user owns the session

    if (error) {
      console.error("Error updating session stats:", error)
      return NextResponse.json(
        { ok: false, message: "Failed to update session stats" },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Error updating session stats:", err)
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}