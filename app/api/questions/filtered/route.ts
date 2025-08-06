import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const { filters, userId } = await req.json()

  const supabase = await createClient()

  try {
    // Build the base query
    let query = supabase.from("questions").select(`
        *,
        specialty:specialties(id, name),
        exam_type:exam_types(id, name)
      `)

    // Apply specialty filters - if empty array, include all
    if (filters.specialties && filters.specialties.length > 0) {
      const { data: specialtyIds } = await supabase
        .from("specialties")
        .select("id")
        .in("name", filters.specialties)
        .range(0, 999) // Ensure we get all matching specialties

      if (specialtyIds && specialtyIds.length > 0) {
        query = query.in(
          "specialty_id",
          specialtyIds.map((s) => s.id),
        )
      }
    }

    // Apply exam type filters - if empty array, include all
    if (filters.examTypes && filters.examTypes.length > 0) {
      const { data: examTypeIds } = await supabase
        .from("exam_types")
        .select("id")
        .in("name", filters.examTypes)
        .range(0, 999) // Ensure we get all matching exam types

      if (examTypeIds && examTypeIds.length > 0) {
        query = query.in(
          "exam_type_id",
          examTypeIds.map((e) => e.id),
        )
      }
    }

    // Apply year filters - if empty array, include all
    if (filters.years && filters.years.length > 0) {
      query = query.in("year", filters.years)
    }

    // Apply difficulty filters - if empty array, include all
    if (filters.difficulties && filters.difficulties.length > 0) {
      query = query.in("difficulty", filters.difficulties)
    }

    // Get total count first to determine appropriate range
    const countQuery = supabase.from("questions").select("*", { count: "exact", head: true })
    
    // Apply the same filters for counting
    if (filters.specialties && filters.specialties.length > 0) {
      const { data: specialtyIds } = await supabase
        .from("specialties")
        .select("id")
        .in("name", filters.specialties)
        .range(0, 999)
      
      if (specialtyIds && specialtyIds.length > 0) {
        countQuery.in("specialty_id", specialtyIds.map((s) => s.id))
      }
    }
    
    if (filters.examTypes && filters.examTypes.length > 0) {
      const { data: examTypeIds } = await supabase
        .from("exam_types")
        .select("id")
        .in("name", filters.examTypes)
        .range(0, 999)
      
      if (examTypeIds && examTypeIds.length > 0) {
        countQuery.in("exam_type_id", examTypeIds.map((e) => e.id))
      }
    }
    
    if (filters.years && filters.years.length > 0) {
      countQuery.in("year", filters.years)
    }
    
    if (filters.difficulties && filters.difficulties.length > 0) {
      countQuery.in("difficulty", filters.difficulties)
    }
    
    const { count: totalFilteredCount } = await countQuery
    const rangeEnd = Math.max(99999, totalFilteredCount || 99999)
    
    // Apply range after all filters to ensure we get all matching questions
    query = query.range(0, rangeEnd)

    const { data: questions, error } = await query

    if (error) throw error

    // Get user progress and answers for filtering by question status
    let userProgress: any[] = []
    let userAnswers: any[] = []

    if (userId && userId !== "temp-user-id") {
      // Get count of user progress first
      const { count: progressCount } = await supabase
        .from("user_question_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      const progressRangeEnd = Math.max(99999, progressCount || 99999)
      
      const { data: progressData } = await supabase
        .from("user_question_progress")
        .select("*")
        .eq("user_id", userId)
        .range(0, progressRangeEnd) // Ensure we get all user progress data

      // Get count of user answers first
      const { count: answersCount } = await supabase
        .from("user_answers")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      const answersRangeEnd = Math.max(99999, answersCount || 99999)

      // Get all user answers with question_id, is_correct, and answered_at
      const { data: answersData } = await supabase
        .from("user_answers")
        .select("question_id, is_correct, answered_at")
        .eq("user_id", userId)
        .order("answered_at", { ascending: false }) // Most recent first
        .range(0, answersRangeEnd) // Ensure we get all user answers

      userProgress = progressData || []
      userAnswers = answersData || []
    }

    // Filter questions based on status - if empty array, include all
    let filteredQuestions = questions || []

    if (filters.questionStatus && filters.questionStatus.length > 0) {
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

      filteredQuestions = filteredQuestions.filter((question) => {
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
      })
    }

    return NextResponse.json({
      questions: filteredQuestions,
      count: filteredQuestions.length,
    })
  } catch (err) {
    console.error("Error filtering questions:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
