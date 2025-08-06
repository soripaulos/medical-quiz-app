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
      console.warn("RPC function not available, using fallback approach:", rpcErr)
    }

    // Optimized fallback: Use pagination to get all distinct years
    let allYears = new Set<number>()
    let hasMore = true
    let offset = 0
    const pageSize = 1000
    
    while (hasMore) {
      const { data: questions, error } = await supabase
        .from("questions")
        .select("year")
        .not("year", "is", null)
        .range(offset, offset + pageSize - 1)
        .order("year", { ascending: false })

      if (error) {
        console.error("Error fetching years page:", error)
        break
      }

      if (!questions || questions.length === 0) {
        hasMore = false
        break
      }

      // Add years to our set
      questions.forEach((q) => {
        if (q.year) {
          allYears.add(q.year)
        }
      })

      // Check if we got fewer results than requested (end of data)
      if (questions.length < pageSize) {
        hasMore = false
      } else {
        offset += pageSize
      }
    }

    // If we didn't get any years, try with admin client
    if (allYears.size === 0) {
      const adminSupabase = createAdminClient()
      
      let adminOffset = 0
      hasMore = true
      
      while (hasMore) {
        const { data: adminQuestions, error: adminError } = await adminSupabase
          .from("questions")
          .select("year")
          .not("year", "is", null)
          .range(adminOffset, adminOffset + pageSize - 1)
          .order("year", { ascending: false })

        if (adminError || !adminQuestions || adminQuestions.length === 0) {
          hasMore = false
          break
        }

        adminQuestions.forEach((q) => {
          if (q.year) {
            allYears.add(q.year)
          }
        })

        if (adminQuestions.length < pageSize) {
          hasMore = false
        } else {
          adminOffset += pageSize
        }
      }
    }

    // Convert set to sorted array
    const sortedYears = Array.from(allYears).sort((a, b) => b - a)
    
    return NextResponse.json({ years: sortedYears })
  } catch (err) {
    console.error("Error fetching years:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}