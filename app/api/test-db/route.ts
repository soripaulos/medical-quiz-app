import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    console.log("Testing database connectivity...")
    const supabase = await createClient()

    // Test basic connectivity by getting table counts
    const tests = {
      exam_types: await supabase.from("exam_types").select("*", { count: "exact", head: true }),
      specialties: await supabase.from("specialties").select("*", { count: "exact", head: true }),
      questions: await supabase.from("questions").select("*", { count: "exact", head: true }),
    }

    const results = {
      connectivity: "OK",
      tables: {} as Record<string, any>
    }

    for (const [table, result] of Object.entries(tests)) {
      if (result.error) {
        console.error(`Error accessing ${table}:`, result.error)
        results.tables[table] = { error: result.error.message, count: null }
      } else {
        console.log(`${table} table: ${result.count} records`)
        results.tables[table] = { count: result.count, error: null }
      }
    }

    // Get some sample data
    const sampleData = {
      exam_types: await supabase.from("exam_types").select("*").limit(5),
      specialties: await supabase.from("specialties").select("*").limit(5),
      questions_with_years: await supabase.from("questions").select("year").not("year", "is", null).limit(10)
    }

    for (const [table, result] of Object.entries(sampleData)) {
      if (result.data) {
        results.tables[table + "_sample"] = result.data
      }
    }

    return NextResponse.json(results)
  } catch (err) {
    console.error("Database connectivity test failed:", err)
    return NextResponse.json({ 
      connectivity: "FAILED",
      error: err instanceof Error ? err.message : String(err),
      message: "Database connectivity test failed"
    }, { status: 500 })
  }
}