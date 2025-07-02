import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request, context: { params: Promise<{ sessionId: string }> }) {
  const supabase = await createClient()

  try {
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

export async function PUT(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = await createClient()
    const { sessionId } = params
    const body = await req.json()
    const { current_question_index } = body

    if (typeof current_question_index !== "number") {
      return new Response("Invalid input", { status: 400 })
    }

    const { data, error } = await supabase
      .from("user_sessions")
      .update({
        current_question_index: current_question_index,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select()

    if (error) throw error

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
