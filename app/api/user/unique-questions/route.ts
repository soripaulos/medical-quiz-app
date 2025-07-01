import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Count unique questions the user has encountered
    const { data: uniqueQuestions, error } = await supabase
      .from("user_answers")
      .select("question_id")
      .eq("user_id", userId)

    if (error) {
      console.error("Error fetching unique questions:", error)
      return NextResponse.json({ error: "Failed to fetch unique questions" }, { status: 500 })
    }

    // Get unique question IDs
    const uniqueQuestionIds = new Set((uniqueQuestions || []).map((q) => q.question_id))
    const uniqueQuestionCount = uniqueQuestionIds.size

    return NextResponse.json({ uniqueQuestions: uniqueQuestionCount })
  } catch (error) {
    console.error("Error in unique questions API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
