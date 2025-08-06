import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const { filters, userId } = await req.json()

  const supabase = await createClient()

  try {
    console.log("Filtering questions with filters:", filters, "for user:", userId)

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

    // Fetch all matching questions using batching to avoid limits
    console.log("Fetching questions with batching approach...")
    let allQuestions: any[] = []
    let attempts = 0
    let hasMore = true
    const batchSize = 1000

    while (hasMore && attempts < 50) { // Allow for up to 50k questions
      const batchQuery = query
        .range(attempts * batchSize, (attempts + 1) * batchSize - 1)
        .order("created_at", { ascending: false })

      const { data: batch, error } = await batchQuery

      if (error) {
        console.error(`Error in questions batch ${attempts}:`, error)
        throw error
      }

      if (batch && batch.length > 0) {
        allQuestions.push(...batch)
        console.log(`Questions batch ${attempts}: fetched ${batch.length} questions, total: ${allQuestions.length}`)
        
        // If we got less than the batch size, we've reached the end
        if (batch.length < batchSize) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
      
      attempts++
    }

    console.log(`Total questions fetched: ${allQuestions.length}`)

    // Get user progress and answers for filtering by question status
    let userProgress: any[] = []
    let userAnswers: any[] = []

    if (userId && userId !== "temp-user-id") {
      console.log("Fetching user progress and answers...")
      
      // Fetch user progress with batching
      let progressAttempts = 0
      let hasMoreProgress = true
      
      while (hasMoreProgress && progressAttempts < 20) { // Allow for up to 20k progress records
        const { data: progressBatch, error: progressError } = await supabase
          .from("user_question_progress")
          .select("*")
          .eq("user_id", userId)
          .range(progressAttempts * batchSize, (progressAttempts + 1) * batchSize - 1)

        if (progressError) {
          console.error(`Error in progress batch ${progressAttempts}:`, progressError)
          break
        }

        if (progressBatch && progressBatch.length > 0) {
          userProgress.push(...progressBatch)
          console.log(`Progress batch ${progressAttempts}: fetched ${progressBatch.length} records, total: ${userProgress.length}`)
          
          if (progressBatch.length < batchSize) {
            hasMoreProgress = false
          }
        } else {
          hasMoreProgress = false
        }
        
        progressAttempts++
      }

      // Fetch user answers with batching
      let answersAttempts = 0
      let hasMoreAnswers = true
      
      while (hasMoreAnswers && answersAttempts < 50) { // Allow for up to 50k answer records
        const { data: answersBatch, error: answersError } = await supabase
          .from("user_answers")
          .select("question_id, is_correct, answered_at")
          .eq("user_id", userId)
          .order("answered_at", { ascending: false })
          .range(answersAttempts * batchSize, (answersAttempts + 1) * batchSize - 1)

        if (answersError) {
          console.error(`Error in answers batch ${answersAttempts}:`, answersError)
          break
        }

        if (answersBatch && answersBatch.length > 0) {
          userAnswers.push(...answersBatch)
          console.log(`Answers batch ${answersAttempts}: fetched ${answersBatch.length} records, total: ${userAnswers.length}`)
          
          if (answersBatch.length < batchSize) {
            hasMoreAnswers = false
          }
        } else {
          hasMoreAnswers = false
        }
        
        answersAttempts++
      }

      console.log(`Total user progress records: ${userProgress.length}`)
      console.log(`Total user answer records: ${userAnswers.length}`)
    }

    // Filter questions based on status - if empty array, include all
    let filteredQuestions = allQuestions

    if (filters.questionStatus && filters.questionStatus.length > 0) {
      console.log("Applying question status filters:", filters.questionStatus)
      
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
      
      console.log(`After status filtering: ${filteredQuestions.length} questions`)
    }

    console.log(`Final result: ${filteredQuestions.length} questions`)

    return NextResponse.json({
      questions: filteredQuestions,
      count: filteredQuestions.length,
    })
  } catch (err) {
    console.error("Error filtering questions:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
