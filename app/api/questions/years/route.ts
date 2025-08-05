import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@/lib/supabase/admin-client"

export async function GET() {
  try {
    console.log("=== YEARS API DEBUG START ===")
    
    // Test with both regular client and admin client
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    console.log("Testing with regular client first...")
    
    const { data: questions, error: fallbackError } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
      .range(0, 9999) // Explicitly set range to get all rows

    console.log("Regular client - Fallback query error:", fallbackError)
    console.log("Regular client - Total questions fetched:", questions?.length)
    
    // Also test with admin client
    console.log("Testing with admin client...")
    const { data: adminQuestions, error: adminError } = await adminSupabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
      .range(0, 9999)

    console.log("Admin client - Query error:", adminError)
    console.log("Admin client - Total questions fetched:", adminQuestions?.length)

    // Use whichever query returned more results
    const questionsToUse = (adminQuestions?.length || 0) > (questions?.length || 0) ? adminQuestions : questions
    const errorToCheck = (adminQuestions?.length || 0) > (questions?.length || 0) ? adminError : fallbackError
    const clientUsed = (adminQuestions?.length || 0) > (questions?.length || 0) ? "admin" : "regular"
    
    console.log(`Using ${clientUsed} client results`)

    if (errorToCheck) {
      console.error("Query failed:", errorToCheck)
      throw errorToCheck
    }

    console.log("Raw questions data (first 20):", questionsToUse?.slice(0, 20))
    console.log("Raw questions data (last 20):", questionsToUse?.slice(-20))
    
    // Get unique years and sort them
    const allYears = questionsToUse?.map((q) => q.year).filter(Boolean) || []
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
        regularClientCount: questions?.length || 0,
        adminClientCount: adminQuestions?.length || 0,
        clientUsed,
        totalYears: allYears.length,
        uniqueYears: uniqueYears.length
      }
    })
  } catch (err) {
    console.error("Error fetching years:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
