import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: questions, error } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
      .order("year", { ascending: false })

    if (error) throw error

    // Get unique years
    const uniqueYears = [...new Set(questions?.map((q) => q.year).filter(Boolean))] as number[]

    return NextResponse.json({ years: uniqueYears })
  } catch (err) {
    console.error("Error fetching years:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
