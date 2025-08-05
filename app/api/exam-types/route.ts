import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    console.log("Fetching exam types from database...")
    const { data: examTypes, error } = await supabase.from("exam_types").select("*").order("name")

    if (error) {
      console.error("Database error fetching exam types:", error)
      throw error
    }

    console.log("Successfully fetched exam types:", examTypes?.length || 0, "records")
    return NextResponse.json({ examTypes })
  } catch (err) {
    console.error("Error fetching exam types:", err)
    return NextResponse.json({ 
      ok: false, 
      message: String(err),
      error: err instanceof Error ? err.message : String(err)
    }, { status: 500 })
  }
}
