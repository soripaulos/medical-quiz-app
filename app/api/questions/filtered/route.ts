import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const { filters, userId, limit = 5000, offset = 0 } = await req.json()

  const supabase = await createClient()

  try {
    // Build the base query with explicit limit to override Supabase's default 1000 limit
    let query = supabase.from("questions").select(`
        *,
        specialty:specialties(id, name),
        exam_type:exam_types(id, name)
      `)

    // Apply specialty filters - if empty array, include all
    if (filters.specialties && filters.specialties.length > 0) {
      const { data: specialtyIds } = await supabase.from("specialties").select("id").in("name", filters.specialties)

      if (specialtyIds && specialtyIds.length > 0) {
        query = query.in(
          "specialty_id",
          specialtyIds.map((s) => s.id),
        )
      }
    }

    // Apply exam type filters - if empty array, include all
    if (filters.examTypes && filters.examTypes.length > 0) {
      const { data: examTypeIds } = await supabase.from("exam_types").select("id").in("name", filters.examTypes)

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

    // Add explicit limit and offset to handle large datasets properly
    // Use a high limit (5000) to get most questions, but allow pagination if needed
    query = query.range(offset, offset + limit - 1)

    const { data: questions, error } = await query

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

    // Implement better randomization that ensures diversity across specialties
    if (filteredQuestions.length > 0) {
      // Group questions by specialty to ensure diversity
      const questionsBySpecialty = new Map<string, any[]>()
      
      filteredQuestions.forEach(question => {
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

    return NextResponse.json({
      questions: filteredQuestions,
      count: filteredQuestions.length,
      hasMore: filteredQuestions.length === limit, // Indicate if there might be more questions
      offset: offset,
      limit: limit
    })
  } catch (err) {
    console.error("Error filtering questions:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
