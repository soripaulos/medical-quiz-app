import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    console.log("Fetching years from questions table...")
    const { data: questions, error } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
      .order("year", { ascending: false })

    if (error) {
      console.error("Database error fetching years:", error)
      throw error
    }

    console.log("Raw questions data:", questions?.length || 0, "records with years")
    
    // Get unique years
    const uniqueYears = [...new Set(questions?.map((q) => q.year).filter(Boolean))] as number[]
    console.log("Unique years found:", uniqueYears)

    return NextResponse.json({ years: uniqueYears })
  } catch (err) {
    console.error("Error fetching years:", err)
    return NextResponse.json({ 
      ok: false, 
      message: String(err),
      error: err instanceof Error ? err.message : String(err)
    }, { status: 500 })
  }
}
