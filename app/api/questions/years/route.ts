import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    // Use a more efficient approach with a direct SQL query for distinct years
    // This is much more efficient than fetching all questions and filtering in JS
    const { data: years, error } = await supabase
      .rpc('get_distinct_years')

    if (error) {
      // Fallback to the previous method if the RPC doesn't exist
      console.warn("RPC get_distinct_years not found, falling back to regular query")
      
      const { data: questions, error: fallbackError } = await supabase
        .from("questions")
        .select("year")
        .not("year", "is", null)
        .range(0, 9999) // Explicitly set range to get all rows
        .order("year", { ascending: false })

      if (fallbackError) throw fallbackError

      console.log("Raw questions data:", questions?.slice(0, 10)) // Log first 10 for debugging
      
      // Get unique years and sort them
      const uniqueYears = [...new Set(questions?.map((q) => q.year).filter(Boolean))] as number[]
      console.log("Unique years found:", uniqueYears)
      
      const sortedYears = uniqueYears.sort((a, b) => b - a) // Most recent first
      console.log("Sorted years:", sortedYears)

      return NextResponse.json({ years: sortedYears })
    }

    console.log("RPC years result:", years)
    
    // Sort the years from the RPC function (most recent first)
    const sortedYears = (years || []).sort((a: number, b: number) => b - a)
    console.log("Final sorted years:", sortedYears)

    return NextResponse.json({ years: sortedYears })
  } catch (err) {
    console.error("Error fetching years:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
