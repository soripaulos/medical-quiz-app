import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ultraFastFilterCache } from "@/lib/cache/ultra-fast-filter-cache"

export async function POST(req: Request) {
  const startTime = Date.now()
  const { filters, userId } = await req.json()

  const supabase = await createClient()

  try {
    // Check ultra-fast cache first
    const cachedResult = ultraFastFilterCache.getQuestionCount(filters, userId)
    if (cachedResult) {
      return NextResponse.json(cachedResult)
    }

    // Optimize by combining specialty and exam type lookups in parallel with caching
    const [specialtyIds, examTypeIds] = await Promise.all([
      // Get specialty IDs with caching
      filters.specialties && filters.specialties.length > 0
        ? (async () => {
            const cached = ultraFastFilterCache.getSpecialtyIds(filters.specialties)
            if (cached) return cached
            
            const { data: specialtyData, error: specialtyError } = await supabase
              .from("specialties")
              .select("id")
              .in("name", filters.specialties)
            
            if (!specialtyError && specialtyData) {
              const ids = specialtyData.map((s: any) => s.id) || []
              ultraFastFilterCache.setSpecialtyIds(filters.specialties, ids)
              return ids
            }
            return []
          })()
        : Promise.resolve([]),
      
      // Get exam type IDs with caching
      filters.examTypes && filters.examTypes.length > 0
        ? (async () => {
            const cached = ultraFastFilterCache.getExamTypeIds(filters.examTypes)
            if (cached) return cached
            
            const { data: examTypeData, error: examTypeError } = await supabase
              .from("exam_types")
              .select("id")
              .in("name", filters.examTypes)
            
            if (!examTypeError && examTypeData) {
              const ids = examTypeData.map((e: any) => e.id) || []
              ultraFastFilterCache.setExamTypeIds(filters.examTypes, ids)
              return ids
            }
            return []
          })()
        : Promise.resolve([])
    ])

    // Build optimized count query using indexes
    let countQuery = supabase.from("questions").select("*", { count: "exact", head: true })

    // Apply filters in order of selectivity (most selective first)
    // Years are usually most selective
    if (filters.years && filters.years.length > 0) {
      countQuery = countQuery.in("year", filters.years)
    }

    // Difficulty is usually quite selective
    if (filters.difficulties && filters.difficulties.length > 0) {
      countQuery = countQuery.in("difficulty", filters.difficulties)
    }

    // Specialty filtering (use IDs for better index performance)
    if (filters.specialties && filters.specialties.length > 0 && specialtyIds.length > 0) {
      countQuery = countQuery.in("specialty_id", specialtyIds)
    }

    // Exam type filtering (use IDs for better index performance)
    if (filters.examTypes && filters.examTypes.length > 0 && examTypeIds.length > 0) {
      countQuery = countQuery.in("exam_type_id", examTypeIds)
    }

    // Execute count query
    const countResult = await countQuery

    if (countResult.error) throw countResult.error

    let totalCount = countResult.count || 0

    // Apply status filtering count adjustment if needed
    if (userId && userId !== "temp-user-id" && filters.questionStatus && filters.questionStatus.length > 0) {
      // For status filtering, we need to do a more complex count
      // This is a simplified approach - in practice, you might want to create a specialized RPC function
      
      // Get a sample of questions to estimate the status filtering impact
      const sampleQuery = supabase.from("questions").select("id").limit(100)
      
      // Apply same base filters to sample
      if (filters.years && filters.years.length > 0) {
        sampleQuery.in("year", filters.years)
      }
      if (filters.difficulties && filters.difficulties.length > 0) {
        sampleQuery.in("difficulty", filters.difficulties)
      }
      if (specialtyIds.length > 0) {
        sampleQuery.in("specialty_id", specialtyIds)
      }
      if (examTypeIds.length > 0) {
        sampleQuery.in("exam_type_id", examTypeIds)
      }
      
      const sampleResult = await sampleQuery
      
      if (!sampleResult.error && sampleResult.data) {
        const sampleIds = sampleResult.data.map((q: any) => q.id)
        
        if (sampleIds.length > 0) {
          // Get user progress for sample
          const [progressResult, answersResult] = await Promise.all([
            filters.questionStatus.includes("flagged")
              ? supabase.from("user_question_progress")
                  .select("question_id")
                  .eq("user_id", userId)
                  .eq("is_flagged", true)
                  .in("question_id", sampleIds)
              : Promise.resolve({ data: [], error: null }),
            
            supabase.from("user_answers")
              .select("question_id, is_correct")
              .eq("user_id", userId)
              .in("question_id", sampleIds)
          ])
          
          const userProgress = progressResult.data || []
          const userAnswers = answersResult.data || []
          
          // Calculate filtering ratio based on sample
          const answerMap = new Map(userAnswers.map((a: any) => [a.question_id, a.is_correct]))
          const progressMap = new Set(userProgress.map((p: any) => p.question_id))
          
          let matchingCount = 0
          sampleIds.forEach((id: string) => {
            const hasAnswered = answerMap.has(id)
            const isCorrect = hasAnswered && answerMap.get(id)
            const isIncorrect = hasAnswered && !answerMap.get(id)
            const isFlagged = progressMap.has(id)
            
            const matches = (
              (filters.questionStatus.includes("answered") && hasAnswered) ||
              (filters.questionStatus.includes("unanswered") && !hasAnswered) ||
              (filters.questionStatus.includes("correct") && isCorrect) ||
              (filters.questionStatus.includes("incorrect") && isIncorrect) ||
              (filters.questionStatus.includes("flagged") && isFlagged)
            )
            
            if (matches) matchingCount++
          })
          
          // Apply ratio to total count (rough estimation)
          const ratio = sampleIds.length > 0 ? matchingCount / sampleIds.length : 0
          totalCount = Math.round(totalCount * ratio)
        }
      }
    }

    const responseTime = `${Date.now() - startTime}ms`
    
    // Cache the result
    const result = {
      count: totalCount,
      performance: {
        cached: false,
        responseTime,
        method: 'optimized-count',
        filtersApplied: {
          years: filters.years?.length || 0,
          specialties: specialtyIds.length,
          examTypes: examTypeIds.length,
          difficulties: filters.difficulties?.length || 0,
          questionStatus: filters.questionStatus?.length || 0
        }
      }
    }
    
    ultraFastFilterCache.setQuestionCount(filters, result, userId)

    return NextResponse.json(result)

  } catch (err) {
    console.error("Error counting questions:", err)
    return NextResponse.json({ 
      count: 0,
      error: String(err),
      performance: {
        cached: false,
        responseTime: `${Date.now() - startTime}ms`,
        method: 'error'
      }
    }, { status: 500 })
  }
}