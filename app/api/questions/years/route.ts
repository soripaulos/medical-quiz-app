import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin-client"

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
      // RPC function not available, continue to fallback
    }

    // Fallback: Get all questions using range to bypass default limits
    // First, get total count to determine appropriate range
    const { count: totalCount } = await supabase
      .from("questions")
      .select("*", { count: "exact", head: true })
      .not("year", "is", null)

    const rangeEnd = Math.max(99999, totalCount || 99999)
    
    const { data: questions, error } = await supabase
      .from("questions")
      .select("year")
      .not("year", "is", null)
      .range(0, rangeEnd) // Use dynamic range based on actual count

    // If regular client failed or returned no results, try admin client
          if (error || !questions || questions.length === 0) {
      const adminSupabase = createAdminClient()
      
      // Get count for admin client as well
      const { count: adminTotalCount } = await adminSupabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .not("year", "is", null)

      const adminRangeEnd = Math.max(99999, adminTotalCount || 99999)
      
      const { data: adminQuestions, error: adminError } = await adminSupabase
          .from("questions")
          .select("year")
          .not("year", "is", null)
          .range(0, adminRangeEnd)

      if (!adminError && adminQuestions && adminQuestions.length > 0) {
        const allYears = adminQuestions.map((q) => q.year).filter(Boolean) || []
        const uniqueYears = [...new Set(allYears)] as number[]
        const sortedYears = uniqueYears.sort((a, b) => b - a)
        return NextResponse.json({ years: sortedYears })
      }
    }

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
