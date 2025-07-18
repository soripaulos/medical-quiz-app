import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifySession } from "@/lib/auth"

export async function GET(req: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    // Authenticate user first
    const userSession = await verifySession()
    
    if (!userSession) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const { sessionId } = await context.params
    
    // Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("id", sessionId)
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
      .eq("session_id", sessionId)
      .order("question_order")

    if (questionsError) throw questionsError

    // Extract questions and maintain order
    const questions = sessionQuestions?.map((sq: any) => sq.questions) || []

    // Fetch user answers for this session
    const { data: userAnswers } = await supabase.from("user_answers").select("*").eq("session_id", sessionId)

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
