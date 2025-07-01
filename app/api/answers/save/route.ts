import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const { userId, questionId, sessionId, selectedChoiceLetter, isCorrect } = await req.json()

  const supabase = await createClient()

  try {
    // Get session to check track_progress setting
    const { data: sessionData, error: sessionError } = await supabase
      .from("user_sessions")
      .select("track_progress")
      .eq("id", sessionId)
      .single()

    if (sessionError) throw new Error("Session not found")

    const { track_progress } = sessionData

    // Save or update user answer (this always happens regardless of track_progress)
    const { error: answerError } = await supabase.from("user_answers").upsert(
      {
        user_id: userId,
        question_id: questionId,
        session_id: sessionId,
        selected_choice_letter: selectedChoiceLetter,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,question_id,session_id",
      },
    )

    if (answerError) throw answerError

    // Only update user question progress if track_progress is enabled
    if (track_progress) {
      const { data: existingProgress } = await supabase
        .from("user_question_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("question_id", questionId)
        .single()

      if (existingProgress) {
        // Update existing progress
        const { error: progressError } = await supabase
          .from("user_question_progress")
          .update({
            times_attempted: existingProgress.times_attempted + 1,
            times_correct: isCorrect ? existingProgress.times_correct + 1 : existingProgress.times_correct,
            last_attempted: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingProgress.id)

        if (progressError) throw progressError
      } else {
        // Create new progress record
        const { error: progressError } = await supabase.from("user_question_progress").insert({
          user_id: userId,
          question_id: questionId,
          times_attempted: 1,
          times_correct: isCorrect ? 1 : 0,
          is_flagged: false,
          last_attempted: new Date().toISOString(),
        })

        if (progressError) throw progressError
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Error saving answer:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
