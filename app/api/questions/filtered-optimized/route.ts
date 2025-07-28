import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const { filters, userId, limit = 5000, offset = 0 } = await req.json()

  const supabase = await createClient()

  try {
    // Use database functions for optimal performance
    const [specialtyIds, examTypeIds] = await Promise.all([
      // Get specialty IDs using optimized function if available
      filters.specialties && filters.specialties.length > 0
        ? supabase.rpc('get_specialty_ids', { specialty_names: filters.specialties })
            .then(({ data, error }: { data: any; error: any }) => error ? [] : (data || []))
            .catch(() => 
              // Fallback to direct query
              supabase.from("specialties").select("id").in("name", filters.specialties)
                .then(({ data }: { data: any }) => data?.map((s: any) => s.id) || [])
            )
        : Promise.resolve([]),
      
      // Get exam type IDs using optimized function if available
      filters.examTypes && filters.examTypes.length > 0
        ? supabase.rpc('get_exam_type_ids', { exam_type_names: filters.examTypes })
            .then(({ data, error }: { data: any; error: any }) => error ? [] : (data || []))
            .catch(() => 
              // Fallback to direct query
              supabase.from("exam_types").select("id").in("name", filters.examTypes)
                .then(({ data }: { data: any }) => data?.map((e: any) => e.id) || [])
            )
        : Promise.resolve([])
    ])

    // Prepare filter parameters for database function
    const filterParams = {
      p_specialty_ids: specialtyIds.length > 0 ? specialtyIds : null,
      p_exam_type_ids: examTypeIds.length > 0 ? examTypeIds : null,
      p_years: filters.years && filters.years.length > 0 ? filters.years : null,
      p_difficulties: filters.difficulties && filters.difficulties.length > 0 ? filters.difficulties : null,
      p_limit: limit,
      p_offset: offset
    }

    // Try to use optimized database functions first
    let questions: any[] = []
    let totalCount = 0

    try {
      // Use optimized filtering function
      const [questionsResult, countResult] = await Promise.all([
        supabase.rpc('get_filtered_questions', filterParams),
        supabase.rpc('count_filtered_questions', {
          p_specialty_ids: filterParams.p_specialty_ids,
          p_exam_type_ids: filterParams.p_exam_type_ids,
          p_years: filterParams.p_years,
          p_difficulties: filterParams.p_difficulties
        })
      ])

      if (!questionsResult.error && !countResult.error) {
        questions = questionsResult.data || []
        totalCount = countResult.data || 0
      } else {
        throw new Error('Database functions not available')
      }
    } catch (dbFuncError) {
      console.warn('Database functions not available, using fallback queries')
      
      // Fallback to direct queries
      const buildQuery = (selectClause: string, includeCount = false) => {
        let query = supabase.from("questions").select(selectClause, includeCount ? { count: "exact", head: true } : {})

        // Apply filters in optimal order
        if (filters.years && filters.years.length > 0) {
          query = query.in("year", filters.years)
        }
        if (filters.difficulties && filters.difficulties.length > 0) {
          query = query.in("difficulty", filters.difficulties)
        }
        if (specialtyIds.length > 0) {
          query = query.in("specialty_id", specialtyIds)
        }
        if (examTypeIds.length > 0) {
          query = query.in("exam_type_id", examTypeIds)
        }

        return query
      }

      const [countResult, questionsResult] = await Promise.all([
        buildQuery("*", true),
        buildQuery(`
          *,
          specialty:specialties(id, name),
          exam_type:exam_types(id, name)
        `).range(offset, offset + limit - 1).order('created_at', { ascending: false })
      ])

      if (countResult.error || questionsResult.error) {
        throw countResult.error || questionsResult.error
      }

      totalCount = countResult.count || 0
      questions = questionsResult.data || []
    }

    // Handle user status filtering if needed
    if (userId && userId !== "temp-user-id" && filters.questionStatus && filters.questionStatus.length > 0) {
      const questionIds = questions.map((q: any) => q.id)
      
      if (questionIds.length > 0) {
        // Optimized user data fetching
        const userDataPromises = []
        
        // Only fetch progress if flagged status is requested
        if (filters.questionStatus.includes("flagged")) {
          userDataPromises.push(
            supabase.from("user_question_progress")
              .select("question_id, is_flagged")
              .eq("user_id", userId)
              .in("question_id", questionIds)
          )
        } else {
          userDataPromises.push(Promise.resolve({ data: [], error: null }))
        }
        
        // Fetch answers for status filtering
        userDataPromises.push(
          supabase.from("user_answers")
            .select("question_id, is_correct, answered_at")
            .eq("user_id", userId)
            .in("question_id", questionIds)
            .order("answered_at", { ascending: false })
        )

        const [progressResult, answersResult] = await Promise.all(userDataPromises)
        
        const userProgress = progressResult.data || []
        const userAnswers = answersResult.data || []

        // Build lookup maps for performance
        const progressMap = new Map(userProgress.map((p: any) => [p.question_id, p]))
        const latestAnswerMap = new Map<string, { is_correct: boolean; answered_at: string }>()
        
        userAnswers.forEach((answer: any) => {
          if (!latestAnswerMap.has(answer.question_id)) {
            latestAnswerMap.set(answer.question_id, {
              is_correct: answer.is_correct,
              answered_at: answer.answered_at,
            })
          }
        })

        // Pre-compute status checks
        const statusChecks = {
          answered: filters.questionStatus.includes("answered"),
          unanswered: filters.questionStatus.includes("unanswered"),
          correct: filters.questionStatus.includes("correct"),
          incorrect: filters.questionStatus.includes("incorrect"),
          flagged: filters.questionStatus.includes("flagged")
        }

        // Filter questions based on status
        questions = questions.filter((question: any) => {
          const latestAnswer = latestAnswerMap.get(question.id)
          const progress = progressMap.get(question.id) as any

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
    }

    // Optimized randomization
    if (questions.length > 0) {
      // Fisher-Yates shuffle
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]]
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
        statusFilteringApplied: !!(filters.questionStatus && filters.questionStatus.length > 0),
        usedOptimizedFunctions: true
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