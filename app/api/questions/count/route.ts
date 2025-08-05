import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const { filters, userId } = await req.json()

  const supabase = await createClient()

  try {
    // Try to use the optimized SQL function first
    try {
      const { data: count, error: rpcError } = await supabase
        .rpc('count_questions_with_filters', {
          specialty_names: filters.specialties?.length > 0 ? filters.specialties : null,
          exam_type_names: filters.examTypes?.length > 0 ? filters.examTypes : null,
          years: filters.years?.length > 0 ? filters.years : null,
          difficulties: filters.difficulties?.length > 0 ? filters.difficulties : null,
        })

      if (!rpcError && count !== null) {
        return NextResponse.json({ count: count || 0 })
      }
      
      console.warn("RPC count_questions_with_filters failed, falling back to regular query:", rpcError)
    } catch (rpcErr) {
      console.warn("RPC count_questions_with_filters not available, falling back to regular query:", rpcErr)
    }

    // Fallback to the original method if RPC fails
    let countQuery = supabase.from("questions").select("id", { count: "exact", head: true })

    // Apply specialty filters - if empty array, include all
    if (filters.specialties && filters.specialties.length > 0) {
      const { data: specialtyIds } = await supabase.from("specialties").select("id").in("name", filters.specialties)

      if (specialtyIds && specialtyIds.length > 0) {
        countQuery = countQuery.in(
          "specialty_id",
          specialtyIds.map((s) => s.id),
        )
      }
    }

    // Apply exam type filters - if empty array, include all
    if (filters.examTypes && filters.examTypes.length > 0) {
      const { data: examTypeIds } = await supabase.from("exam_types").select("id").in("name", filters.examTypes)

      if (examTypeIds && examTypeIds.length > 0) {
        countQuery = countQuery.in(
          "exam_type_id",
          examTypeIds.map((e) => e.id),
        )
      }
    }

    // Apply year filters - if empty array, include all
    if (filters.years && filters.years.length > 0) {
      countQuery = countQuery.in("year", filters.years)
    }

    // Apply difficulty filters - if empty array, include all
    if (filters.difficulties && filters.difficulties.length > 0) {
      countQuery = countQuery.in("difficulty", filters.difficulties)
    }

    const { data: questions, error } = await countQuery.select("*")

    if (error) throw error

    let questionCount = questions?.length || 0

    // If question status filters are applied and we have a user, we need to filter based on user progress
    if (filters.questionStatus && filters.questionStatus.length > 0 && userId && userId !== "temp-user-id") {
      // Get user progress and answers for filtering by question status
      const [progressResult, answersResult] = await Promise.all([
        supabase.from("user_question_progress").select("*").eq("user_id", userId),
        supabase
          .from("user_answers")
          .select("question_id, is_correct, answered_at")
          .eq("user_id", userId)
          .order("answered_at", { ascending: false }) // Most recent first
      ])

      const userProgress = progressResult.data || []
      const userAnswers = answersResult.data || []

      // Create a map of question_id to most recent answer
      const latestAnswerMap = new Map<string, { is_correct: boolean; answered_at: string }>()

      userAnswers.forEach((answer) => {
        if (!latestAnswerMap.has(answer.question_id)) {
          // Since answers are ordered by answered_at DESC, the first occurrence is the most recent
          latestAnswerMap.set(answer.question_id, {
            is_correct: answer.is_correct,
            answered_at: answer.answered_at,
          })
        }
      })

      // Filter questions based on status
      const filteredQuestions = questions?.filter((question) => {
        const progress = userProgress.find((p) => p.question_id === question.id)
        const latestAnswer = latestAnswerMap.get(question.id)

        // Determine question status based on most recent answer
        const hasAnswered = !!latestAnswer
        const isCorrect = hasAnswered && latestAnswer.is_correct
        const isIncorrect = hasAnswered && !latestAnswer.is_correct
        const isFlagged = progress?.is_flagged || false

        return filters.questionStatus.some((status: string) => {
          switch (status) {
            case "answered":
              return hasAnswered
            case "unanswered":
              return !hasAnswered
            case "correct":
              return isCorrect
            case "incorrect":
              return isIncorrect
            case "flagged":
              return isFlagged
            default:
              return false
          }
        })
      }) || []

      questionCount = filteredQuestions.length
    }

    return NextResponse.json({ count: questionCount })
  } catch (err) {
    console.error("Error counting questions:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}