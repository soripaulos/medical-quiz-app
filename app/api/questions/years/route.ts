import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    // Try the optimized RPC function first (gets distinct years directly)
    try {
      const { data: yearsFromRPC, error: rpcError } = await supabase.rpc('get_distinct_years')
      if (!rpcError && yearsFromRPC && yearsFromRPC.length > 0) {
        const sortedYears = yearsFromRPC.map((row: any) => row.year).sort((a: number, b: number) => b - a)
        return NextResponse.json({ years: sortedYears })
      }
    } catch (rpcErr) {
      console.log("RPC function not available, falling back to regular query")
    }

    // Fallback: Get all questions with high limit
    const { data: questions, error } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
      .limit(50000) // High limit to ensure we get all questions

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
