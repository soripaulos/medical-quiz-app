import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/auth"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("session_id")

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
  }

  try {
    // Get current user using DAL
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Get session questions to filter notes
    const { data: sessionQuestions } = await supabase
      .from("session_questions")
      .select("questions(id)")
      .eq("session_id", sessionId)

    const questionIds = sessionQuestions?.map((sq: any) => sq.questions.id) || []

    if (questionIds.length === 0) {
      return NextResponse.json({ notes: [] })
    }

    // Fetch user notes for questions in this session
    const { data: notes, error } = await supabase
      .from("user_notes")
      .select("*")
      .eq("user_id", user.id)
      .in("question_id", questionIds)

    if (error) {
      throw error
    }

    return NextResponse.json({ notes: notes || [] })
  } catch (error) {
    console.error("Error fetching notes:", error)
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 })
  }
}
