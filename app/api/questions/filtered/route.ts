import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const { filters, userId, limit = 5000, offset = 0 } = await req.json()

  const supabase = await createClient()

  try {
    // Optimize by combining specialty and exam type lookups in parallel
    const [specialtyLookup, examTypeLookup] = await Promise.all([
      // Get specialty IDs if needed
      filters.specialties && filters.specialties.length > 0
        ? supabase.from("specialties").select("id, name").in("name", filters.specialties)
        : Promise.resolve({ data: [], error: null }),
      
      // Get exam type IDs if needed
      filters.examTypes && filters.examTypes.length > 0
        ? supabase.from("exam_types").select("id, name").in("name", filters.examTypes)
        : Promise.resolve({ data: [], error: null })
    ])

    const specialtyIds = specialtyLookup.data?.map((s: any) => s.id) || []
    const examTypeIds = examTypeLookup.data?.map((e: any) => e.id) || []

    // Build optimized base query using indexes
    const buildBaseQuery = (selectClause: string, includeCount = false) => {
      let query = supabase.from("questions").select(selectClause, includeCount ? { count: "exact", head: true } : {})

      // Apply filters in order of selectivity (most selective first)
      // Years are usually most selective
      if (filters.years && filters.years.length > 0) {
        query = query.in("year", filters.years)
      }

      // Difficulty is usually quite selective
      if (filters.difficulties && filters.difficulties.length > 0) {
        query = query.in("difficulty", filters.difficulties)
      }

      // Specialty filtering (use IDs for better index performance)
      if (filters.specialties && filters.specialties.length > 0 && specialtyIds.length > 0) {
        query = query.in("specialty_id", specialtyIds)
      }

      // Exam type filtering (use IDs for better index performance)
      if (filters.examTypes && filters.examTypes.length > 0 && examTypeIds.length > 0) {
        query = query.in("exam_type_id", examTypeIds)
      }

      return query
    }

    // Get count and data in parallel for better performance
    const [countResult, questionsResult] = await Promise.all([
      // Get total count
      buildBaseQuery("*", true),
      
      // Get actual questions with joins
      buildBaseQuery(`
        *,
        specialty:specialties(id, name),
        exam_type:exam_types(id, name)
      `).range(offset, offset + limit - 1).order('created_at', { ascending: false })
    ])

    if (countResult.error) throw countResult.error
    if (questionsResult.error) throw questionsResult.error

    const totalCount = countResult.count || 0
    let questions = questionsResult.data || []

    // Optimize user data fetching - only fetch if status filtering is needed
    let userProgress: any[] = []
    let userAnswers: any[] = []
    let latestAnswerMap = new Map<string, { is_correct: boolean; answered_at: string }>()

    if (userId && userId !== "temp-user-id" && filters.questionStatus && filters.questionStatus.length > 0) {
      // Extract question IDs for targeted queries
      const questionIds = questions.map(q => q.id)
      
      if (questionIds.length > 0) {
        // Fetch user data only for the questions we're working with
        const [progressResult, answersResult] = await Promise.all([
          // Only fetch progress if flagged status is requested
          filters.questionStatus.includes("flagged")
            ? supabase.from("user_question_progress")
                .select("question_id, is_flagged")
                .eq("user_id", userId)
                .in("question_id", questionIds)
            : Promise.resolve({ data: [], error: null }),
          
          // Fetch answers for status filtering
          supabase.from("user_answers")
            .select("question_id, is_correct, answered_at")
            .eq("user_id", userId)
            .in("question_id", questionIds)
            .order("answered_at", { ascending: false })
        ])

        userProgress = progressResult.data || []
        userAnswers = answersResult.data || []

        // Build answer map more efficiently
        userAnswers.forEach((answer: any) => {
          if (!latestAnswerMap.has(answer.question_id)) {
            latestAnswerMap.set(answer.question_id, {
              is_correct: answer.is_correct,
              answered_at: answer.answered_at,
            })
          }
        })
      }
    }

    // Apply status filtering more efficiently
    if (filters.questionStatus && filters.questionStatus.length > 0) {
      // Create progress map for faster lookups
      const progressMap = new Map(userProgress.map((p: any) => [p.question_id, p]))
      
      // Pre-compute status checks to avoid repeated calculations
      const statusChecks = {
        answered: filters.questionStatus.includes("answered"),
        unanswered: filters.questionStatus.includes("unanswered"),
        correct: filters.questionStatus.includes("correct"),
        incorrect: filters.questionStatus.includes("incorrect"),
        flagged: filters.questionStatus.includes("flagged")
      }

      questions = questions.filter((question: any) => {
        const latestAnswer = latestAnswerMap.get(question.id)
        const progress = progressMap.get(question.id)

        const hasAnswered = !!latestAnswer
        const isCorrect = hasAnswered && latestAnswer.is_correct
        const isIncorrect = hasAnswered && !latestAnswer.is_correct
        const isFlagged = progress?.is_flagged || false

        return (
          (statusChecks.answered && hasAnswered) ||
          (statusChecks.unanswered && !hasAnswered) ||
          (statusChecks.correct && isCorrect) ||
          (statusChecks.incorrect && isIncorrect) ||
          (statusChecks.flagged && isFlagged)
        )
      })
    }

    // Optimized randomization with better performance
    if (questions.length > 0) {
      // Simple Fisher-Yates shuffle for better performance
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]]
      }

      // If we need specialty diversity, do a secondary sort
      if (questions.length > 100) { // Only for larger sets
        // Group by specialty and interleave
        const specialtyGroups = new Map<string, any[]>()
        
        questions.forEach((question: any) => {
          const specialtyName = question.specialty?.name || 'Unknown'
          if (!specialtyGroups.has(specialtyName)) {
            specialtyGroups.set(specialtyName, [])
          }
          specialtyGroups.get(specialtyName)!.push(question)
        })

        // Interleave if we have multiple specialties
        if (specialtyGroups.size > 1) {
          const interleavedQuestions: any[] = []
          const specialtyArrays = Array.from(specialtyGroups.values())
          const maxLength = Math.max(...specialtyArrays.map(arr => arr.length))

          for (let i = 0; i < maxLength; i++) {
            specialtyArrays.forEach(arr => {
              if (i < arr.length) {
                interleavedQuestions.push(arr[i])
              }
            })
          }

          questions = interleavedQuestions
        }
      }
    }

    // Return appropriate count
    const finalCount = filters.questionStatus && filters.questionStatus.length > 0 
      ? questions.length  // If status filtering is applied, use the filtered count
      : totalCount        // Otherwise, use the total count from the database

    return NextResponse.json({
      questions,
      count: finalCount,
      hasMore: questions.length === limit,
      offset: offset,
      limit: limit,
      performance: {
        totalFromDB: totalCount,
        afterFiltering: questions.length,
        statusFilteringApplied: !!(filters.questionStatus && filters.questionStatus.length > 0)
      }
    })

  } catch (err) {
    console.error("Error filtering questions:", err)
    return NextResponse.json({ 
      ok: false, 
      message: String(err),
      questions: [],
      count: 0
    }, { status: 500 })
  }
}
