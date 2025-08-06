import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: questions, error } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)

    if (error) throw error

    // Get unique years and sort them
    const allYears = questions?.map((q) => q.year).filter(Boolean) || []
    const uniqueYears = [...new Set(allYears)] as number[]
    const sortedYears = uniqueYears.sort((a, b) => b - a) // Most recent first

    return NextResponse.json({ years: sortedYears })
  } catch (err) {
    console.error("Error fetching years:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
