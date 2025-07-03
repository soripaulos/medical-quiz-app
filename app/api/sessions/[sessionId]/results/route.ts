import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifySession } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    // Authenticate user first
    const userSession = await verifySession()
    
    if (!userSession) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const { sessionId } = await context.params

    // Fetch session details with stored metrics
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      console.error("Session error:", sessionError)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Fetch session questions with details
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
      console.error("Questions error:", questionsError)
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
    }

    const questions =
      sessionQuestions?.map((sq: any) => ({
        ...sq.questions,
        specialty: sq.questions.specialties,
        exam_type: sq.questions.exam_types,
      })) || []

    // Fetch user answers for this session
    const { data: userAnswers, error: answersError } = await supabase
      .from("user_answers")
      .select("*")
      .eq("session_id", sessionId)
      .order("answered_at")

    if (answersError) {
      console.error("Answers error:", answersError)
    }

    // Fetch user progress for flagged questions
    const { data: userProgress, error: progressError } = await supabase
      .from("user_question_progress")
      .select("*")
      .eq("user_id", session.user_id)
      .in(
        "question_id",
        questions.map((q) => q.id),
      )

    if (progressError) {
      console.error("Progress error:", progressError)
    }

    // Use stored metrics from session
    const performance = {
      totalQuestions: session.total_questions,
      correctAnswers: session.correct_answers || 0,
      incorrectAnswers: session.incorrect_answers || 0,
      unansweredQuestions: session.unanswered_questions || 0,
      accuracy: session.total_questions > 0 ? ((session.correct_answers || 0) / session.total_questions) * 100 : 0,
      timeSpent: session.total_time_spent || 0,
      averageTimePerQuestion:
        session.total_questions > 0 ? Math.floor((session.total_time_spent || 0) / session.total_questions) : 0,
    }

    // Category breakdown
    const categoryMap = new Map()
    questions.forEach((q) => {
      const specialty = q.specialty?.name || "Unknown"
      if (!categoryMap.has(specialty)) {
        categoryMap.set(specialty, { total: 0, correct: 0 })
      }
      const stats = categoryMap.get(specialty)
      stats.total++

      const userAnswer = userAnswers?.find((a) => a.question_id === q.id)
      if (userAnswer?.is_correct) {
        stats.correct++
      }
    })

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([specialty, stats]) => ({
      specialty,
      total: stats.total,
      correct: stats.correct,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    }))

    // Difficulty breakdown
    const difficultyMap = new Map()
    questions.forEach((q) => {
      const level = q.difficulty || 1
      if (!difficultyMap.has(level)) {
        difficultyMap.set(level, { total: 0, correct: 0 })
      }
      const stats = difficultyMap.get(level)
      stats.total++

      const userAnswer = userAnswers?.find((a) => a.question_id === q.id)
      if (userAnswer?.is_correct) {
        stats.correct++
      }
    })

    const difficultyBreakdown = Array.from(difficultyMap.entries())
      .map(([level, stats]) => ({
        level,
        total: stats.total,
        correct: stats.correct,
        accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      }))
      .sort((a, b) => a.level - b.level)

    // Question details
    const questionDetails = questions.map((q) => {
      const userAnswer = userAnswers?.find((a) => a.question_id === q.id)
      const progress = userProgress?.find((p) => p.question_id === q.id)

      return {
        questionId: q.id,
        questionText: q.question_text,
        userAnswer: userAnswer?.selected_choice_letter || null,
        correctAnswer: q.correct_answer,
        isCorrect: userAnswer?.is_correct || false,
        timeSpent: Math.floor((session.total_time_spent || 0) / session.total_questions), // Simple distribution
        difficulty: q.difficulty || 1,
        specialty: q.specialty?.name || "Unknown",
        isFlagged: progress?.is_flagged || false,
      }
    })

    const results = {
      session,
      questions,
      userAnswers: userAnswers || [],
      userProgress: userProgress || [],
      performance,
      categoryBreakdown,
      difficultyBreakdown,
      questionDetails,
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Error fetching results:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
