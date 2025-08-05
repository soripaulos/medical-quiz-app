import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    console.log("=== YEARS API DEBUG START ===")
    
    // Try different approaches to get all years
    console.log("Method 1: Using range(0, 9999)")
    const { data: questions1, error: error1 } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
      .range(0, 9999)

    console.log("Method 1 - Error:", error1)
    console.log("Method 1 - Total questions fetched:", questions1?.length)
    
    console.log("Method 2: Without range limit")
    const { data: questions2, error: error2 } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)

    console.log("Method 2 - Error:", error2)
    console.log("Method 2 - Total questions fetched:", questions2?.length)
    
    console.log("Method 3: Using limit(10000)")
    const { data: questions3, error: error3 } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
      .limit(10000)

    console.log("Method 3 - Error:", error3)
    console.log("Method 3 - Total questions fetched:", questions3?.length)

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

    console.log(`Using best method: ${bestResult.method} with ${bestResult.data?.length} questions`)

    const questionsToUse = bestResult.data || []
    
    console.log("Raw questions data (first 20):", questionsToUse.slice(0, 20))
    console.log("Raw questions data (last 20):", questionsToUse.slice(-20))
    
    // Get unique years and sort them
    const allYears = questionsToUse.map((q) => q.year).filter(Boolean) || []
    console.log("All years (first 50):", allYears.slice(0, 50))
    console.log("All years count:", allYears.length)
    
    const uniqueYears = [...new Set(allYears)] as number[]
    console.log("Unique years found:", uniqueYears)
    console.log("Unique years count:", uniqueYears.length)
    
    const sortedYears = uniqueYears.sort((a, b) => b - a) // Most recent first
    console.log("Final sorted years:", sortedYears)
    console.log("=== YEARS API DEBUG END ===")

    return NextResponse.json({ 
      years: sortedYears,
      debug: {
        totalQuestions: questionsToUse.length,
        methodUsed: bestResult.method,
        totalYears: allYears.length,
        uniqueYears: uniqueYears.length
      }
    })
  } catch (err) {
    console.error("Error fetching years:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
