import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin-client"

export async function GET() {
  const supabase = await createClient()

  try {
    console.log("Fetching distinct years from questions...")

    // Try the optimized RPC function first (gets distinct years directly)
    try {
      console.log("Attempting RPC function get_distinct_years...")
      const { data: yearsFromRPC, error: rpcError } = await supabase.rpc('get_distinct_years')
      
      if (!rpcError && yearsFromRPC && yearsFromRPC.length > 0) {
        const sortedYears = yearsFromRPC.map((row: any) => row.year).sort((a: number, b: number) => b - a)
        console.log(`RPC function succeeded, found ${sortedYears.length} years:`, sortedYears)
        return NextResponse.json({ years: sortedYears })
      } else if (rpcError) {
        console.warn("RPC function failed:", rpcError)
      } else {
        console.warn("RPC function returned no data")
      }
    } catch (rpcErr) {
      console.warn("RPC function not available or failed:", rpcErr)
    }

    // Fallback 1: Try with regular client using a more aggressive approach
    console.log("Trying fallback query with regular client...")
    let attempts = 0
    let allQuestions: any[] = []
    let hasMore = true
    const batchSize = 1000

    while (hasMore && attempts < 50) { // Limit to prevent infinite loops, but allow for 50k questions
      const { data: batch, error } = await supabase
        .from("questions")
        .select("year")
        .not("year", "is", null)
        .range(attempts * batchSize, (attempts + 1) * batchSize - 1)
        .order("year", { ascending: false })

      if (error) {
        console.error(`Error in batch ${attempts}:`, error)
        break
      }

      if (batch && batch.length > 0) {
        allQuestions.push(...batch)
        console.log(`Batch ${attempts}: fetched ${batch.length} questions, total: ${allQuestions.length}`)
        
        // If we got less than the batch size, we've reached the end
        if (batch.length < batchSize) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
      
      attempts++
    }

    if (allQuestions.length > 0) {
      const allYears = allQuestions.map((q) => q.year).filter(Boolean)
      const uniqueYears = [...new Set(allYears)] as number[]
      const sortedYears = uniqueYears.sort((a, b) => b - a)
      console.log(`Regular client succeeded with batching, found ${sortedYears.length} unique years from ${allQuestions.length} questions:`, sortedYears)
      return NextResponse.json({ years: sortedYears })
    }

    // Fallback 2: Try with admin client if regular client failed or returned no results
    console.log("Trying fallback query with admin client...")
    const adminSupabase = createAdminClient()
    
    attempts = 0
    allQuestions = []
    hasMore = true

    while (hasMore && attempts < 50) { // Limit to prevent infinite loops
      const { data: batch, error: adminError } = await adminSupabase
        .from("questions")
        .select("year")
        .not("year", "is", null)
        .range(attempts * batchSize, (attempts + 1) * batchSize - 1)
        .order("year", { ascending: false })

      if (adminError) {
        console.error(`Admin client error in batch ${attempts}:`, adminError)
        break
      }

      if (batch && batch.length > 0) {
        allQuestions.push(...batch)
        console.log(`Admin batch ${attempts}: fetched ${batch.length} questions, total: ${allQuestions.length}`)
        
        // If we got less than the batch size, we've reached the end
        if (batch.length < batchSize) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
      
      attempts++
    }

    if (allQuestions.length > 0) {
      const allYears = allQuestions.map((q) => q.year).filter(Boolean)
      const uniqueYears = [...new Set(allYears)] as number[]
      const sortedYears = uniqueYears.sort((a, b) => b - a)
      console.log(`Admin client succeeded with batching, found ${sortedYears.length} unique years from ${allQuestions.length} questions:`, sortedYears)
      return NextResponse.json({ years: sortedYears })
    }

    // If we get here, no method worked
    console.error("All methods failed to fetch years")
    return NextResponse.json({ years: [] })
    
  } catch (err) {
    console.error("Error fetching years:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
