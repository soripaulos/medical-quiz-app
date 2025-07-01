import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin-client"

export async function GET() {
  const supabase = createAdminClient()

  try {
    const { count, error } = await supabase.from("questions").select("*", { count: "exact", head: true })

    if (error) {
      console.error("Error fetching total questions:", error)
      return NextResponse.json({ error: "Failed to fetch total questions" }, { status: 500 })
    }

    return NextResponse.json({ totalQuestions: count })
  } catch (error) {
    console.error("Unexpected error fetching total questions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
