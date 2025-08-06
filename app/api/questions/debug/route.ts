import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin-client"

export async function GET() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  try {
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      tests: []
    }

    // Test 1: Get total question count
    try {
      const { data: totalCountRPC } = await supabase.rpc('get_total_question_count')
      debugInfo.tests.push({
        name: "Total Question Count (RPC)",
        success: true,
        result: totalCountRPC
      })
    } catch (error) {
      debugInfo.tests.push({
        name: "Total Question Count (RPC)",
        success: false,
        error: String(error)
      })
    }

    // Test 2: Get year statistics
    try {
      const { data: yearStats, error } = await supabase.rpc('get_year_statistics')
      debugInfo.tests.push({
        name: "Year Statistics (RPC)",
        success: !error,
        result: yearStats,
        error: error ? String(error) : null
      })
    } catch (error) {
      debugInfo.tests.push({
        name: "Year Statistics (RPC)",
        success: false,
        error: String(error)
      })
    }

    // Test 3: Direct query for distinct years (regular client)
    try {
      const { data: directYears, error } = await supabase
        .from("questions")
        .select("year")
        .not("year", "is", null)
        .range(0, 10000)

      const uniqueYears = directYears ? [...new Set(directYears.map(q => q.year))].filter((year): year is number => typeof year === 'number').sort((a, b) => b - a) : []
      
      debugInfo.tests.push({
        name: "Direct Years Query (Regular Client)",
        success: !error,
        result: {
          totalRecords: directYears?.length || 0,
          uniqueYears: uniqueYears,
          yearCount: uniqueYears.length
        },
        error: error ? String(error) : null
      })
    } catch (error) {
      debugInfo.tests.push({
        name: "Direct Years Query (Regular Client)",
        success: false,
        error: String(error)
      })
    }

    // Test 4: Direct query for distinct years (admin client)
    try {
      const { data: adminDirectYears, error } = await adminSupabase
        .from("questions")
        .select("year")
        .not("year", "is", null)
        .range(0, 10000)

      const adminUniqueYears = adminDirectYears ? [...new Set(adminDirectYears.map(q => q.year))].filter((year): year is number => typeof year === 'number').sort((a, b) => b - a) : []
      
      debugInfo.tests.push({
        name: "Direct Years Query (Admin Client)",
        success: !error,
        result: {
          totalRecords: adminDirectYears?.length || 0,
          uniqueYears: adminUniqueYears,
          yearCount: adminUniqueYears.length
        },
        error: error ? String(error) : null
      })
    } catch (error) {
      debugInfo.tests.push({
        name: "Direct Years Query (Admin Client)",
        success: false,
        error: String(error)
      })
    }

    // Test 5: Test the get_distinct_years RPC function
    try {
      const { data: rpcYears, error } = await supabase.rpc('get_distinct_years')
      debugInfo.tests.push({
        name: "get_distinct_years RPC",
        success: !error,
        result: {
          years: rpcYears?.map((r: any) => r.year) || [],
          yearCount: rpcYears?.length || 0
        },
        error: error ? String(error) : null
      })
    } catch (error) {
      debugInfo.tests.push({
        name: "get_distinct_years RPC",
        success: false,
        error: String(error)
      })
    }

    // Test 6: Sample some questions with their years
    try {
      const { data: sampleQuestions, error } = await supabase
        .from("questions")
        .select("id, year, created_at")
        .not("year", "is", null)
        .order("created_at", { ascending: false })
        .limit(20)

      debugInfo.tests.push({
        name: "Sample Questions with Years",
        success: !error,
        result: sampleQuestions,
        error: error ? String(error) : null
      })
    } catch (error) {
      debugInfo.tests.push({
        name: "Sample Questions with Years",
        success: false,
        error: String(error)
      })
    }

    // Test 7: Count questions by year ranges
    try {
      const yearRanges = [
        { name: "2010-2014", min: 2010, max: 2014 },
        { name: "2015-2019", min: 2015, max: 2019 },
        { name: "2020-2024", min: 2020, max: 2024 },
        { name: "2025+", min: 2025, max: 2030 }
      ]

      const rangeCounts = []
      for (const range of yearRanges) {
        const { count, error } = await supabase
          .from("questions")
          .select("id", { count: "exact", head: true })
          .gte("year", range.min)
          .lte("year", range.max)

        rangeCounts.push({
          range: range.name,
          count: count || 0,
          error: error ? String(error) : null
        })
      }

      debugInfo.tests.push({
        name: "Year Range Counts",
        success: true,
        result: rangeCounts
      })
    } catch (error) {
      debugInfo.tests.push({
        name: "Year Range Counts",
        success: false,
        error: String(error)
      })
    }

    return NextResponse.json(debugInfo)
  } catch (err) {
    console.error("Error in debug endpoint:", err)
    return NextResponse.json({ 
      error: String(err),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}