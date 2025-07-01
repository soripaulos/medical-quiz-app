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

    const { data: notes, error } = await supabase
      .from("user_notes")
      .select(`
        id,
        question_id,
        note_text,
        created_at,
        questions (
          question_text,
          choice_a,
          choice_b,
          choice_c,
          choice_d,
          choice_e,
          correct_answer,
          specialties (name)
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching user notes:", error)
      return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 })
    }

    // Transform the data to flatten the structure
    const transformedNotes = (notes || []).map((note) => ({
      id: note.id,
      question_id: note.question_id,
      note_text: note.note_text,
      created_at: note.created_at,
      question_text: note.questions?.question_text || "",
      choice_a: note.questions?.choice_a || "",
      choice_b: note.questions?.choice_b || "",
      choice_c: note.questions?.choice_c || "",
      choice_d: note.questions?.choice_d || "",
      choice_e: note.questions?.choice_e || "",
      correct_answer: note.questions?.correct_answer || "",
      specialty: note.questions?.specialties?.name || "Unknown",
    }))

    return NextResponse.json({ notes: transformedNotes })
  } catch (error) {
    console.error("Error in user notes API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
