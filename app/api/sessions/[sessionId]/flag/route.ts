import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/auth"

export async function POST(
  req: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { question_id, is_flagged } = await req.json()
    const { sessionId } = await context.params

    // Get current user using DAL
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Check if progress record exists
    const { data: existingProgress } = await supabase
      .from("user_question_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("question_id", question_id)
      .single()

    if (existingProgress) {
      // Update existing progress record
      const { error } = await supabase
        .from("user_question_progress")
        .update({
          is_flagged: is_flagged,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProgress.id)

      if (error) {
        console.error("Error updating flag:", error)
        return NextResponse.json({ error: "Failed to update flag" }, { status: 500 })
      }
    } else {
      // Create new progress record with flag
      const { error } = await supabase
        .from("user_question_progress")
        .insert({
          user_id: user.id,
          question_id: question_id,
          times_attempted: 0,
          times_correct: 0,
          is_flagged: is_flagged,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (error) {
        console.error("Error creating progress with flag:", error)
        return NextResponse.json({ error: "Failed to create progress record" }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error in flag endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}