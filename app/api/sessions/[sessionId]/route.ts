import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request, { params }: { params: { sessionId: string } }) {
  const supabase = await createClient()

  try {
    // Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("id", params.sessionId)
      .single()

    if (sessionError) throw sessionError

    // Fetch session questions in order
    const { data: sessionQuestions, error: questionsError } = await supabase
      .from("session_questions")
      .select(
        `
        question_order,
        questions (
          *,
          specialty:specialties(id, name),
          exam_type:exam_types(id, name)
        )
      `,
      )
      .eq("session_id", params.sessionId)
      .order("question_order")

    if (questionsError) throw questionsError

    // Extract questions and maintain order
    const questions = sessionQuestions?.map((sq: any) => sq.questions) || []

    // Fetch user answers for this session
    const { data: userAnswers } = await supabase.from("user_answers").select("*").eq("session_id", params.sessionId)

    // Fetch user progress
    const { data: userProgress } = await supabase
      .from("user_question_progress")
      .select("*")
      .eq("user_id", session.user_id)
      .in(
        "question_id",
        questions.map((q) => q.id),
      )

    return NextResponse.json({
      session,
      questions,
      userAnswers: userAnswers || [],
      userProgress: userProgress || [],
    })
  } catch (err) {
    console.error("Error fetching session:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
