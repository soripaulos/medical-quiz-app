import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    console.log("Fetching specialties from database...")
    const { data: specialties, error } = await supabase.from("specialties").select("*").order("name")

    if (error) {
      console.error("Database error fetching specialties:", error)
      throw error
    }

    console.log("Successfully fetched specialties:", specialties?.length || 0, "records")
    return NextResponse.json({ specialties })
  } catch (err) {
    console.error("Error fetching specialties:", err)
    return NextResponse.json({ 
      ok: false, 
      message: String(err),
      error: err instanceof Error ? err.message : String(err)
    }, { status: 500 })
  }
}
