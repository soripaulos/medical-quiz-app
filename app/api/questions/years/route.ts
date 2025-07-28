import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    // Use a more efficient query to get distinct years
    // This is more efficient than loading all questions and then filtering
    const { data, error } = await supabase
      .rpc('get_distinct_years')

    if (error) {
      // Fallback to the original method if the RPC function doesn't exist
      console.warn("RPC function 'get_distinct_years' not found, using fallback method")
      
      const { data: questions, error: fallbackError } = await supabase
        .from("questions")
        .select("year")
        .not("year", "is", null)
        .limit(10000) // High limit to ensure we get all questions
        .order("year", { ascending: false })

      if (fallbackError) throw fallbackError

      // Get unique years and sort them
      const uniqueYears = [...new Set(questions?.map((q) => q.year).filter(Boolean))] as number[]
      uniqueYears.sort((a, b) => b - a)

      return NextResponse.json({ 
        years: uniqueYears,
        count: uniqueYears.length 
      })
    }

    // Sort years in descending order (newest first)
    const sortedYears = (data || []).sort((a: number, b: number) => b - a)

    return NextResponse.json({ 
      years: sortedYears,
      count: sortedYears.length 
    })
  } catch (err) {
    console.error("Error fetching years:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
