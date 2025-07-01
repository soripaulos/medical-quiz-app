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

    // Get user answers with question categories
    const { data: answers, error } = await supabase
      .from("user_answers")
      .select(`
        is_correct,
        questions (
          specialties (name)
        )
      `)
      .eq("user_id", userId)

    if (error) {
      console.error("Error fetching category performance:", error)
      return NextResponse.json({ error: "Failed to fetch category performance" }, { status: 500 })
    }

    // Group by category and calculate performance
    const categoryStats: { [key: string]: { correct: number; incorrect: number; total: number } } = {}
    ;(answers || []).forEach((answer) => {
      const categoryName = answer.questions?.specialties?.name || "Unknown"

      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = { correct: 0, incorrect: 0, total: 0 }
      }

      categoryStats[categoryName].total++
      if (answer.is_correct) {
        categoryStats[categoryName].correct++
      } else {
        categoryStats[categoryName].incorrect++
      }
    })

    // Transform to array format with accuracy calculation
    const categories = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      total: stats.total,
      correct: stats.correct,
      incorrect: stats.incorrect,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    }))

    return NextResponse.json({ categories })
  } catch (error) {
    console.error("Error in category performance API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
