import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const { userId, questionId, noteText } = await req.json()

  const supabase = await createClient()

  try {
    const { error } = await supabase.from("user_notes").upsert(
      {
        user_id: userId,
        question_id: questionId,
        note_text: noteText,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,question_id",
      },
    )

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Error saving note:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
