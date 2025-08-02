import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifySession } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    // Authenticate user
    const session = await verifySession()
    
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { sessionName, sessionMode, filters, questionIds, timeLimit, randomizeOrder, trackProgress } =
      await req.json()

    const supabase = await createClient()

    // Shuffle questions if randomization is enabled
    // Note: Questions are already randomized with better distribution in the filtered API
    // This provides an additional shuffle if requested
    const finalQuestionIds = randomizeOrder ? [...questionIds].sort(() => Math.random() - 0.5) : questionIds

    // Calculate estimated time if no time limit is provided for exam mode
    let finalTimeLimit = timeLimit
    if (sessionMode === "exam" && !timeLimit) {
      // Estimate 1.5 minutes per question for exam mode
      const estimatedMinutes = Math.ceil(questionIds.length * 1.5)
      finalTimeLimit = estimatedMinutes
    }

    // Validate required fields
    if (!sessionName || !sessionMode || !questionIds || questionIds.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Missing required fields: sessionName, sessionMode, or questionIds" },
        { status: 400 }
      )
    }

    // Create the session
    const sessionData = {
      user_id: session.user.id,
      session_name: sessionName,
      session_type: sessionMode === "exam" ? "exam" : "practice",
      total_questions: questionIds.length,
      current_question_index: 0,
      time_limit: finalTimeLimit,
      time_remaining: finalTimeLimit ? finalTimeLimit * 60 : null, // Convert minutes to seconds
      filters: filters,
      questions_order: finalQuestionIds,
      is_active: true,
      track_progress: sessionMode === "practice" ? trackProgress : true, // Always track progress for exams
      active_time_seconds: 0, // Initialize elapsed time
    }

    const { data: userSession, error: sessionError } = await supabase
      .from("user_sessions")
      .insert(sessionData)
      .select()
      .single()

    if (sessionError) {
      console.error("Session creation error:", sessionError)
      throw sessionError
    }

    // Create session questions
    const sessionQuestions = finalQuestionIds.map((questionId: string, index: number) => ({
      session_id: userSession.id,
      question_id: questionId,
      question_order: index + 1,
    }))

    const { error: questionsError } = await supabase.from("session_questions").insert(sessionQuestions)

    if (questionsError) {
      console.error("Session questions creation error:", questionsError)
      throw questionsError
    }

    // Update user's profile to set this as their active session
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ active_session_id: userSession.id })
      .eq("id", session.user.id)

    if (profileError) {
      console.error("Error setting active session:", profileError)
      // Don't throw here - the session was created successfully, this is just a nice-to-have
    }

    return NextResponse.json({ session: userSession })
  } catch (err) {
    console.error("Error creating session:", err)
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: err instanceof Error && err.message === "Unauthorized" ? 401 : 400 },
    )
  }
}
