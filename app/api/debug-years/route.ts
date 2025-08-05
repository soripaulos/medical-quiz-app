import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    console.log("=== DEBUG YEARS INVESTIGATION ===")

    // 1. Get all questions with years (including nulls)
    const { data: allQuestions, error: allError } = await supabase
      .from("questions")
      .select("id, year, created_at")
      .order("created_at", { ascending: false })
      .limit(100)

    if (allError) {
      console.error("Error fetching all questions:", allError)
      throw allError
    }

    console.log("Total questions fetched:", allQuestions?.length || 0)

    // 2. Get questions with non-null years
    const { data: questionsWithYears, error: yearsError } = await supabase
      .from("questions")
      .select("id, year, created_at")
      .not("year", "is", null)
      .order("year", { ascending: false })

    if (yearsError) {
      console.error("Error fetching questions with years:", yearsError)
      throw yearsError
    }

    console.log("Questions with years:", questionsWithYears?.length || 0)

    // 3. Group by year
    const yearGroups = {}
    questionsWithYears?.forEach(q => {
      const year = q.year
      if (!yearGroups[year]) {
        yearGroups[year] = []
      }
      yearGroups[year].push(q.id)
    })

    console.log("Year groups:", yearGroups)

    // 4. Get unique years using different methods
    const uniqueYearsSet = [...new Set(questionsWithYears?.map(q => q.year).filter(Boolean))]
    const uniqueYearsMap = Array.from(new Map(questionsWithYears?.map(q => [q.year, q])).keys()).filter(Boolean)

    console.log("Unique years (Set method):", uniqueYearsSet)
    console.log("Unique years (Map method):", uniqueYearsMap)

    // 5. Check for data type issues
    const yearTypes = questionsWithYears?.slice(0, 10).map(q => ({
      id: q.id,
      year: q.year,
      yearType: typeof q.year,
      yearString: String(q.year),
      yearNumber: Number(q.year)
    }))

    console.log("Year type analysis:", yearTypes)

    // 6. Get raw year data with SQL-like aggregation
    const { data: yearStats, error: statsError } = await supabase
      .rpc('get_year_stats') // This might not exist, but we'll try
      .catch(() => null) // Ignore if RPC doesn't exist

    // 7. Alternative: Manual aggregation
    const yearCounts = {}
    questionsWithYears?.forEach(q => {
      const year = q.year
      yearCounts[year] = (yearCounts[year] || 0) + 1
    })

    const result = {
      debug: true,
      timestamp: new Date().toISOString(),
      totalQuestions: allQuestions?.length || 0,
      questionsWithYears: questionsWithYears?.length || 0,
      questionsWithNullYears: (allQuestions?.length || 0) - (questionsWithYears?.length || 0),
      yearGroups,
      uniqueYearsSet: uniqueYearsSet.sort((a, b) => b - a),
      uniqueYearsMap: uniqueYearsMap.sort((a, b) => b - a),
      yearCounts,
      yearTypes,
      yearStats,
      sampleQuestions: allQuestions?.slice(0, 5).map(q => ({
        id: q.id,
        year: q.year,
        yearIsNull: q.year === null,
        yearType: typeof q.year,
        created_at: q.created_at
      })),
      sampleQuestionsWithYears: questionsWithYears?.slice(0, 10).map(q => ({
        id: q.id,
        year: q.year,
        yearType: typeof q.year,
        created_at: q.created_at
      }))
    }

    console.log("Final result:", JSON.stringify(result, null, 2))

    return NextResponse.json(result)
  } catch (err) {
    console.error("Debug years error:", err)
    return NextResponse.json({ 
      debug: true,
      error: true,
      message: String(err),
      errorDetails: err instanceof Error ? err.message : String(err)
    }, { status: 500 })
  }
}