import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth"

export async function GET() {
  try {
    // Verify admin access
    await requireAdmin()

    const supabase = await createClient()
    
    // Get total question count
    const { count: totalQuestions, error } = await supabase
      .from("questions")
      .select("*", { count: "exact", head: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ totalQuestions: totalQuestions || 0 })
  } catch (error) {
    console.error("Error fetching total questions:", error)
    return NextResponse.json({ 
      error: "Failed to fetch total questions",
      totalQuestions: 0 
    }, { status: 500 })
  }
}
