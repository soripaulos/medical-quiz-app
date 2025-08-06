import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin-client"

export async function GET() {
  const supabase = await createClient()

  try {
    // Try the optimized database function first
    const { data: yearsFromFunction, error: functionError } = await supabase.rpc('get_distinct_years')
    
    if (!functionError && yearsFromFunction && yearsFromFunction.length > 0) {
      const sortedYears = yearsFromFunction.map((row: any) => row.year).sort((a: number, b: number) => b - a)
      return NextResponse.json({ years: sortedYears })
    }

    // Try different approaches to get all years
    const { data: questions1, error: error1 } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
      .range(0, 9999)
    
    const { data: questions2, error: error2 } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
    
    const { data: questions3, error: error3 } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
      .limit(10000)

    // Try with admin client (bypasses RLS) as fallback
    const adminSupabase = createAdminClient()
    const { data: adminQuestions, error: adminError } = await adminSupabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
      .range(0, 9999)

    // Use the method that returned the most results
    const results = [
      { data: questions1, error: error1, method: "range(0,9999)" },
      { data: questions2, error: error2, method: "no limit" },
      { data: questions3, error: error3, method: "limit(10000)" },
      { data: adminQuestions, error: adminError, method: "admin client (bypasses RLS)" }
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
