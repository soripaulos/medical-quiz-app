import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const { filters, userId, countOnly = false, page = 0, pageSize = 1000, randomize = false } = await req.json()

  const supabase = await createClient()

  try {
    // Helper function to build base query conditions
    const buildQueryConditions = async (baseQuery: any) => {
      let query = baseQuery

      // Apply specialty filters - if empty array, include all
      if (filters.specialties && filters.specialties.length > 0) {
        const { data: specialtyIds, error: specialtyError } = await supabase.from("specialties").select("id").in("name", filters.specialties)

        if (specialtyError) {
          console.error("Error fetching specialty IDs:", specialtyError)
          throw new Error(`Failed to fetch specialties: ${specialtyError.message}`)
        }

        if (specialtyIds && specialtyIds.length > 0) {
          query = query.in(
            "specialty_id",
            specialtyIds.map((s) => s.id),
          )
        }
      }

      // Apply exam type filters - if empty array, include all
      if (filters.examTypes && filters.examTypes.length > 0) {
        const { data: examTypeIds, error: examTypeError } = await supabase.from("exam_types").select("id").in("name", filters.examTypes)

        if (examTypeError) {
          console.error("Error fetching exam type IDs:", examTypeError)
          throw new Error(`Failed to fetch exam types: ${examTypeError.message}`)
        }

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

      return query
    }

    // If only count is requested, use a more efficient count query
    if (countOnly) {
      let countQuery = supabase.from("questions").select("id", { count: "exact", head: true })
      countQuery = await buildQueryConditions(countQuery)
      
      const { count, error: countError } = await countQuery
      
      if (countError) throw countError
      
      return NextResponse.json({ count: count || 0 })
    }

    // Build the main query with pagination
    const startRange = page * pageSize
    const endRange = startRange + pageSize - 1
    
    let query = supabase.from("questions").select(`
        *,
        specialty:specialties(id, name),
        exam_type:exam_types(id, name)
      `)

    query = await buildQueryConditions(query)
    
    // Apply pagination after filtering
    query = query.range(startRange, endRange)

    // Also get the total count for pagination info
    let countQuery = supabase.from("questions").select("id", { count: "exact", head: true })
    countQuery = await buildQueryConditions(countQuery)

    const [questionsResult, countResult] = await Promise.all([
      query,
      countQuery
    ])

    const { data: questions, error } = questionsResult
    const { count: totalCount, error: countError } = countResult

    if (error) {
      console.error("Error fetching questions:", error)
      throw new Error(`Failed to fetch questions: ${error.message}`)
    }
    if (countError) {
      console.error("Error counting questions:", countError)
      throw new Error(`Failed to count questions: ${countError.message}`)
    }

    // Get user progress and answers for filtering by question status
    let userProgress: any[] = []
    let userAnswers: any[] = []

    if (userId && userId !== "temp-user-id") {
      // Use parallel queries for better performance
      const [progressResult, answersResult] = await Promise.all([
        supabase.from("user_question_progress").select("*").eq("user_id", userId),
        supabase
          .from("user_answers")
          .select("question_id, is_correct, answered_at")
          .eq("user_id", userId)
          .order("answered_at", { ascending: false }) // Most recent first
      ])

      if (progressResult.error) {
        console.error("Error fetching user progress:", progressResult.error)
      }
      if (answersResult.error) {
        console.error("Error fetching user answers:", answersResult.error)
      }

      userProgress = progressResult.data || []
      userAnswers = answersResult.data || []
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

    // Apply randomization at application level if requested
    if (randomize && filteredQuestions.length > 0) {
      // Fisher-Yates shuffle
      for (let i = filteredQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filteredQuestions[i], filteredQuestions[j]] = [filteredQuestions[j], filteredQuestions[i]]
      }
    }

    return NextResponse.json({
      questions: filteredQuestions,
      count: filteredQuestions.length,
      totalCount: totalCount || 0,
      page,
      pageSize,
      hasMore: (totalCount || 0) > endRange + 1
    })
  } catch (err) {
    console.error("Error filtering questions:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
