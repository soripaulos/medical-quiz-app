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
      notes?.map((note: any) => ({
        id: note.id,
        noteText: note.note_text,
        questionId: note.questions?.id,
        questionText: note.questions?.question_text?.substring(0, 100) + "...",
        specialty: note.questions?.specialties?.name || "Unknown",
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      })) || []

    return NextResponse.json({ notes: formattedNotes })
  } catch (error) {
    console.error("Error fetching user notes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
