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

    // Get user notes with question information
    const { data: notes, error: notesError } = await supabase
      .from("user_notes")
      .select(`
        id,
        note_text,
        created_at,
        updated_at,
        questions (
          id,
          question_text,
          choice_a,
          choice_b,
          choice_c,
          choice_d,
          choice_e,
          choice_f,
          correct_answer,
          explanation,
          sources,
          specialties (
            name
          )
        )
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })

    if (notesError) {
      console.error("Notes error:", notesError)
      return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 })
    }

    // Format notes for display
    const formattedNotes =
      notes?.map((note: any) => {
        const question = note.questions
        const choices = []
        
        if (question) {
          if (question.choice_a) choices.push({ letter: "A", text: question.choice_a })
          if (question.choice_b) choices.push({ letter: "B", text: question.choice_b })
          if (question.choice_c) choices.push({ letter: "C", text: question.choice_c })
          if (question.choice_d) choices.push({ letter: "D", text: question.choice_d })
          if (question.choice_e) choices.push({ letter: "E", text: question.choice_e })
          if (question.choice_f) choices.push({ letter: "F", text: question.choice_f })
        }

        return {
          id: note.id,
          noteText: note.note_text,
          questionId: question?.id,
          questionText: question?.question_text,
          questionPreview: question?.question_text?.substring(0, 100) + "...",
          choices,
          correctAnswer: question?.correct_answer,
          explanation: question?.explanation,
          sources: question?.sources,
          specialty: question?.specialties?.name || "Unknown",
          createdAt: note.created_at,
          updatedAt: note.updated_at,
        }
      }) || []

    return NextResponse.json({ notes: formattedNotes })
  } catch (error) {
    console.error("Error fetching user notes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
