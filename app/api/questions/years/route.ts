import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    // Get all unique years directly using distinct
    const { data: yearData, error } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
      .order("year", { ascending: false })

    if (error) throw error

    // Get unique years and sort them
    const uniqueYears = [...new Set(yearData?.map((q) => q.year).filter(Boolean))] as number[]
    const sortedYears = uniqueYears.sort((a, b) => b - a) // Most recent first

    return NextResponse.json({ years: sortedYears })
  } catch (err) {
    console.error("Error fetching years:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
