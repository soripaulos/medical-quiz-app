import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/auth"

export async function GET() {
  try {
    // Get current user using DAL
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user answers with question specialty information
    const { data: answers, error: answersError } = await supabase
      .from("user_answers")
      .select(`
        is_correct,
        questions (
          specialties (
            name
          )
        )
      `)
      .eq("user_id", user.id)

    if (answersError) {
      console.error("Answers error:", answersError)
      return NextResponse.json({ error: "Failed to fetch answers" }, { status: 500 })
    }

    // Group by specialty and calculate performance
    const categoryMap = new Map()

    answers?.forEach((answer: any) => {
      const specialty = answer.questions?.specialties?.name || "Unknown"

      if (!categoryMap.has(specialty)) {
        categoryMap.set(specialty, { total: 0, correct: 0 })
      }

      const stats = categoryMap.get(specialty)
      stats.total++
      if (answer.is_correct) {
        stats.correct++
      }
    })

    // Convert to array format
    const categoryPerformance = Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      total: stats.total,
      correct: stats.correct,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    }))

    // Sort by accuracy descending
    categoryPerformance.sort((a, b) => b.accuracy - a.accuracy)

    return NextResponse.json({ categoryPerformance })
  } catch (error) {
    console.error("Error fetching category performance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
