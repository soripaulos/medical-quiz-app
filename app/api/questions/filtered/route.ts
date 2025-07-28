import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const { filters, userId, limit = 5000, offset = 0 } = await req.json()

  const supabase = await createClient()

  try {
    // First, let's build the queries with proper filtering
    // For specialty filtering, we need to get the specialty IDs first
    let specialtyIds: number[] = []
    if (filters.specialties && filters.specialties.length > 0) {
      const { data: specialtyData, error: specialtyError } = await supabase
        .from("specialties")
        .select("id")
        .in("name", filters.specialties)
      
      if (!specialtyError && specialtyData) {
        specialtyIds = specialtyData.map((s: any) => s.id) || []
      }
    }

    // For exam type filtering, we need to get the exam type IDs first
    let examTypeIds: number[] = []
    if (filters.examTypes && filters.examTypes.length > 0) {
      const { data: examTypeData, error: examTypeError } = await supabase
        .from("exam_types")
        .select("id")
        .in("name", filters.examTypes)
      
      if (!examTypeError && examTypeData) {
        examTypeIds = examTypeData.map((e: any) => e.id) || []
      }
    }

    // Build the query for getting total count
    let countQuery = supabase.from("questions").select("*", { count: "exact", head: true })

    // Apply specialty filters
    if (filters.specialties && filters.specialties.length > 0 && specialtyIds.length > 0) {
      countQuery = countQuery.in("specialty_id", specialtyIds)
    }

    // Apply exam type filters
    if (filters.examTypes && filters.examTypes.length > 0 && examTypeIds.length > 0) {
      countQuery = countQuery.in("exam_type_id", examTypeIds)
    }

    // Apply year filters
    if (filters.years && filters.years.length > 0) {
      countQuery = countQuery.in("year", filters.years)
    }

    // Apply difficulty filters
    if (filters.difficulties && filters.difficulties.length > 0) {
      countQuery = countQuery.in("difficulty", filters.difficulties)
    }

    // Get the total count of questions matching the filters (before question status filtering)
    const { count: totalCount, error: countError } = await countQuery

    if (countError) throw countError

    // Build the query for getting actual questions with full data
    let dataQuery = supabase.from("questions").select(`
        *,
        specialty:specialties(id, name),
        exam_type:exam_types(id, name)
      `)

    // Apply the same filters to the data query
    if (filters.specialties && filters.specialties.length > 0 && specialtyIds.length > 0) {
      dataQuery = dataQuery.in("specialty_id", specialtyIds)
    }

    if (filters.examTypes && filters.examTypes.length > 0 && examTypeIds.length > 0) {
      dataQuery = dataQuery.in("exam_type_id", examTypeIds)
    }

    if (filters.years && filters.years.length > 0) {
      dataQuery = dataQuery.in("year", filters.years)
    }

    if (filters.difficulties && filters.difficulties.length > 0) {
      dataQuery = dataQuery.in("difficulty", filters.difficulties)
    }

    // Add explicit limit and offset to handle large datasets properly
    dataQuery = dataQuery.range(offset, offset + limit - 1)

    const { data: questions, error } = await dataQuery

    if (error) throw error

    // Get user progress and answers for filtering by question status
    let userProgress: any[] = []
    let userAnswers: any[] = []

    if (userId && userId !== "temp-user-id") {
      const { data: progressData } = await supabase.from("user_question_progress").select("*").eq("user_id", userId)

      // Get all user answers with question_id, is_correct, and answered_at
      const { data: answersData } = await supabase
        .from("user_answers")
        .select("question_id, is_correct, answered_at")
        .eq("user_id", userId)
        .order("answered_at", { ascending: false }) // Most recent first

      userProgress = progressData || []
      userAnswers = answersData || []
    }

    // Filter questions based on status - if empty array, include all
    let filteredQuestions = questions || []

    if (filters.questionStatus && filters.questionStatus.length > 0) {
      // Create a map of question_id to most recent answer
      const latestAnswerMap = new Map<string, { is_correct: boolean; answered_at: string }>()

      userAnswers.forEach((answer: any) => {
        if (!latestAnswerMap.has(answer.question_id)) {
          // Since answers are ordered by answered_at DESC, the first occurrence is the most recent
          latestAnswerMap.set(answer.question_id, {
            is_correct: answer.is_correct,
            answered_at: answer.answered_at,
          })
        }
      })

      filteredQuestions = filteredQuestions.filter((question: any) => {
        const progress = userProgress.find((p: any) => p.question_id === question.id)
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

    // Implement better randomization that ensures diversity across specialties
    if (filteredQuestions.length > 0) {
      // Group questions by specialty to ensure diversity
      const questionsBySpecialty = new Map<string, any[]>()
      
      filteredQuestions.forEach((question: any) => {
        const specialtyName = question.specialty?.name || 'Unknown'
        if (!questionsBySpecialty.has(specialtyName)) {
          questionsBySpecialty.set(specialtyName, [])
        }
        questionsBySpecialty.get(specialtyName)!.push(question)
      })

      // Shuffle questions within each specialty
      questionsBySpecialty.forEach((questions, specialty) => {
        for (let i = questions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [questions[i], questions[j]] = [questions[j], questions[i]]
        }
      })

      // Interleave questions from different specialties for better distribution
      const shuffledQuestions: any[] = []
      const specialtyNames = Array.from(questionsBySpecialty.keys())
      let maxQuestionsPerSpecialty = Math.max(...Array.from(questionsBySpecialty.values()).map(arr => arr.length))

      for (let i = 0; i < maxQuestionsPerSpecialty; i++) {
        // Shuffle specialty order for each round to avoid patterns
        const shuffledSpecialties = [...specialtyNames].sort(() => Math.random() - 0.5)
        
        shuffledSpecialties.forEach(specialty => {
          const questions = questionsBySpecialty.get(specialty)!
          if (i < questions.length) {
            shuffledQuestions.push(questions[i])
          }
        })
      }

      filteredQuestions = shuffledQuestions
    }

    // Return the total count from the database query, not the filtered count
    // This gives users the actual number of questions matching their base filters
    const finalCount = filters.questionStatus && filters.questionStatus.length > 0 
      ? filteredQuestions.length  // If status filtering is applied, use the filtered count
      : totalCount || 0           // Otherwise, use the total count from the database

    return NextResponse.json({
      questions: filteredQuestions,
      count: finalCount,
      hasMore: filteredQuestions.length === limit, // Indicate if there might be more questions
      offset: offset,
      limit: limit
    })
  } catch (err) {
    console.error("Error filtering questions:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
