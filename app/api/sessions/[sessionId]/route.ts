import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const supabase = await createClient()
    const { sessionId } = await context.params

    // Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Fetch session questions
    const { data: sessionQuestions, error: questionsError } = await supabase
      .from("session_questions")
      .select(`
        question_order,
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
          explanation_image_url,
          sources,
          difficulty,
          year,
          specialties (id, name),
          exam_types (id, name)
        )
      `)
      .eq("session_id", sessionId)
      .order("question_order")

    if (questionsError) {
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
    }

    const questions =
      sessionQuestions?.map((sq: any) => ({
        ...sq.questions,
        specialty: sq.questions.specialties,
        exam_type: sq.questions.exam_types,
      })) || []

    // Fetch user answers for this session
    const { data: userAnswers } = await supabase
      .from("user_answers")
      .select("*")
      .eq("session_id", sessionId)

    // Fetch user progress for flagged questions
    const { data: userProgress } = await supabase
      .from("user_question_progress")
      .select("*")
      .eq("user_id", session.user_id)
      .in(
        "question_id",
        questions.map((q: any) => q.id),
      )

    return NextResponse.json({
      session,
      questions,
      userAnswers: userAnswers || [],
      userProgress: userProgress || [],
    })
  } catch (err) {
    console.error("Error fetching session:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
