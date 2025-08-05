import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin-client"

export async function GET() {
  console.log("=== ADMIN YEARS API TEST ===")
  
  try {
    const supabase = createClient()

    // Test with admin client (bypasses RLS)
    const { data: questions, error } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
      .range(0, 9999)

    console.log("Admin query error:", error)
    console.log("Admin total questions fetched:", questions?.length)

    if (error) {
      console.error("Admin query failed:", error)
      throw error
    }

    console.log("Admin raw questions data (first 20):", questions?.slice(0, 20))
    
    // Get unique years and sort them
    const allYears = questions?.map((q) => q.year).filter(Boolean) || []
    console.log("Admin all years count:", allYears.length)
    
    const uniqueYears = [...new Set(allYears)] as number[]
    console.log("Admin unique years found:", uniqueYears)
    console.log("Admin unique years count:", uniqueYears.length)
    
    const sortedYears = uniqueYears.sort((a, b) => b - a)
    console.log("Admin final sorted years:", sortedYears)

    return NextResponse.json({ 
      years: sortedYears,
      totalQuestions: questions?.length,
      message: "Admin client test - bypasses RLS"
    })
  } catch (err) {
    console.error("Admin years API error:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}