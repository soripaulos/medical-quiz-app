import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifySession } from "@/lib/auth"

export async function POST(req: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    // Authenticate user
    const session = await verifySession()
    
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const { sessionId } = await context.params
    const { question_id, selected_choice_letter, is_correct, time_spent } = await req.json()

    // Verify the session belongs to the user
    const { data: userSession, error: sessionError } = await supabase
      .from("user_sessions")
      .select("id, user_id, track_progress")
      .eq("id", sessionId)
      .eq("user_id", session.user.id)
      .single()

    if (sessionError || !userSession) {
      return NextResponse.json(
        { ok: false, message: "Session not found" },
        { status: 404 }
      )
    }

    // Save or update user answer
    const { error: answerError } = await supabase.from("user_answers").upsert(
      {
        user_id: session.user.id,
        question_id: question_id,
        session_id: sessionId,
        selected_choice_letter: selected_choice_letter,
        is_correct: is_correct,
        time_spent: time_spent || 0,
        answered_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,question_id,session_id",
      },
    )

    if (answerError) {
      console.error("Error saving answer:", answerError)
      return NextResponse.json(
        { ok: false, message: "Failed to save answer" },
        { status: 500 }
      )
    }

    // Only update user question progress if track_progress is enabled
    if (userSession.track_progress) {
      const { data: existingProgress } = await supabase
        .from("user_question_progress")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("question_id", question_id)
        .single()

      if (existingProgress) {
        // Update existing progress
        const { error: progressError } = await supabase
          .from("user_question_progress")
          .update({
            times_attempted: existingProgress.times_attempted + 1,
            times_correct: is_correct ? existingProgress.times_correct + 1 : existingProgress.times_correct,
            last_attempted: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingProgress.id)

        if (progressError) {
          console.error("Error updating progress:", progressError)
        }
      } else {
        // Create new progress record
        const { error: progressError } = await supabase.from("user_question_progress").insert({
          user_id: session.user.id,
          question_id: question_id,
          times_attempted: 1,
          times_correct: is_correct ? 1 : 0,
          is_flagged: false,
          last_attempted: new Date().toISOString(),
        })

        if (progressError) {
          console.error("Error creating progress:", progressError)
        }
      }
    }

    return NextResponse.json({ 
      ok: true,
      message: "Answer saved successfully"
    })
  } catch (err) {
    console.error("Error in session answers endpoint:", err)
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}