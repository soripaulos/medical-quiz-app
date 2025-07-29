import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin-client"
import { enhancedQuestionCache } from "@/lib/cache/enhanced-question-cache"

export async function GET() {
  try {
    // Check enhanced cache first
    const cachedOptions = enhancedQuestionCache.getFilterOptions()
    if (cachedOptions) {
      return NextResponse.json({
        ...cachedOptions,
        cached: true,
        responseTime: '<10ms'
      })
    }

    const supabase = createAdminClient()

    // Fetch all filter options in parallel for maximum performance
    const [specialtiesResult, examTypesResult, yearsResult, difficultiesResult] = await Promise.all([
      // Get specialties
      supabase.from("specialties").select("name").order("name"),
      
      // Get exam types
      supabase.from("exam_types").select("name").order("name"),
      
      // Get years - try RPC first, then fallback
      (async () => {
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_distinct_years')
          if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
            return { data: rpcData.sort((a: number, b: number) => b - a), error: null }
          }
        } catch (rpcErr) {
          console.warn('RPC function not available for years')
        }
        
        // Fallback to direct query
        const result = await supabase
          .from('questions')
          .select('year')
          .not('year', 'is', null)
          .order('year', { ascending: false })
        
        if (result.error) {
          return { data: [], error: result.error }
        }
        
        const uniqueYears = [...new Set(
          result.data?.map((q: any) => q.year).filter((year: any) => year !== null && year !== undefined)
        )] as number[]
        
        return { data: uniqueYears.sort((a: number, b: number) => b - a), error: null }
      })(),
      
      // Get difficulties
      supabase.from("questions").select("difficulty").not("difficulty", "is", null).order("difficulty")
    ])

    // Process results
    const specialties = specialtiesResult.data?.map((s: any) => s.name) || []
    const examTypes = examTypesResult.data?.map((e: any) => e.name) || []
    
    // Handle years with comprehensive fallback
    let years: number[] = []
    if (!yearsResult.error && yearsResult.data && yearsResult.data.length > 0) {
      years = yearsResult.data
    } else {
      // Comprehensive fallback years
      years = [
        2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016,
        2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006,
        2005, 2004, 2003, 2002, 2001, 2000, 1999, 1998, 1997, 1996, 1995
      ]
    }
    
    // Process difficulties
    const uniqueDifficulties = [...new Set(
      difficultiesResult.data?.map((d: any) => d.difficulty).filter((difficulty: any) => difficulty !== null && difficulty !== undefined)
    )] as number[]
    const difficulties = uniqueDifficulties.sort((a: number, b: number) => a - b)

    const filterOptions = {
      specialties,
      examTypes,
      years,
      difficulties
    }

    // Cache the result
    enhancedQuestionCache.setFilterOptions(filterOptions)
    
    // Also cache individual components
    enhancedQuestionCache.setYears(years)

    return NextResponse.json({
      ...filterOptions,
      cached: false,
      responseTime: 'optimized',
      counts: {
        specialties: specialties.length,
        examTypes: examTypes.length,
        years: years.length,
        difficulties: difficulties.length
      }
    })

  } catch (error) {
    console.error("Error fetching filter options:", error)
    
    // Check if we have any cached data as fallback
    const cachedOptions = enhancedQuestionCache.getFilterOptions()
    if (cachedOptions) {
      return NextResponse.json({
        ...cachedOptions,
        cached: true,
        responseTime: 'cache_fallback',
        error: String(error)
      })
    }

    // Return comprehensive fallback data
    const fallbackOptions = {
      specialties: [
        "Cardiology", "Dermatology", "Emergency Medicine", "Endocrinology",
        "Gastroenterology", "Hematology", "Infectious Disease", "Internal Medicine",
        "Nephrology", "Neurology", "Oncology", "Pediatrics", "Psychiatry",
        "Pulmonology", "Rheumatology", "Surgery"
      ],
      examTypes: [
        "USMLE Step 1", "USMLE Step 2 CK", "USMLE Step 3", "COMLEX Level 1",
        "COMLEX Level 2-CE", "COMLEX Level 3", "NBME", "Shelf Exam"
      ],
      years: [
        2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016,
        2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006,
        2005, 2004, 2003, 2002, 2001, 2000
      ],
      difficulties: [1, 2, 3, 4, 5]
    }

    // Cache fallback for short duration
    enhancedQuestionCache.setFilterOptions(fallbackOptions)
    enhancedQuestionCache.setYears(fallbackOptions.years)

    return NextResponse.json({
      ...fallbackOptions,
      cached: false,
      responseTime: 'fallback',
      error: String(error),
      counts: {
        specialties: fallbackOptions.specialties.length,
        examTypes: fallbackOptions.examTypes.length,
        years: fallbackOptions.years.length,
        difficulties: fallbackOptions.difficulties.length
      }
    })
  }
}