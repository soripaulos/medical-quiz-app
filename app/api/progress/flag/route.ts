import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const { userId, questionId } = await req.json()

  const supabase = await createClient()

  try {
    // Check if progress record exists
    const { data: existingProgress } = await supabase
      .from("user_question_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("question_id", questionId)
      .single()

    if (existingProgress) {
      // Toggle flag status
      const { error } = await supabase
        .from("user_question_progress")
        .update({
          is_flagged: !existingProgress.is_flagged,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProgress.id)

      if (error) throw error
    } else {
      // Create new progress record with flag
      const { error } = await supabase.from("user_question_progress").insert({
        user_id: userId,
        question_id: questionId,
        times_attempted: 0,
        times_correct: 0,
        is_flagged: true,
      })

      if (error) throw error
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Error flagging question:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
