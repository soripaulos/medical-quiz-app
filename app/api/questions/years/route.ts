import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    // Try different approaches to get all years (based on working commit b9da295)
    
    // Method 1: Using range(0, 9999)
    const { data: questions1, error: error1 } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
      .range(0, 9999)
    
    // Method 2: Without range limit
    const { data: questions2, error: error2 } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
    
    // Method 3: Using limit(10000)
    const { data: questions3, error: error3 } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
      .limit(10000)

    // Use the method that returned the most results
    const results = [
      { data: questions1, error: error1, method: "range(0,9999)" },
      { data: questions2, error: error2, method: "no limit" },
      { data: questions3, error: error3, method: "limit(10000)" }
    ]
    
    const bestResult = results
      .filter(r => !r.error && r.data)
      .sort((a, b) => (b.data?.length || 0) - (a.data?.length || 0))[0]

    if (!bestResult) {
      throw new Error("All query methods failed")
    }

    const questionsToUse = bestResult.data || []
    
    // Get unique years and sort them
    const allYears = questionsToUse.map((q) => q.year).filter(Boolean) || []
    const uniqueYears = [...new Set(allYears)] as number[]
    const sortedYears = uniqueYears.sort((a, b) => b - a) // Most recent first

    return NextResponse.json({ years: sortedYears })
  } catch (err) {
    console.error("Error fetching years:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
