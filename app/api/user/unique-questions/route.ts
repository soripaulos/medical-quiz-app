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

    // Get unique questions the user has attempted
    const { data: userAnswers, error: answersError } = await supabase
      .from("user_answers")
      .select("question_id")
      .eq("user_id", user.id)

    if (answersError) {
      console.error("User answers error:", answersError)
      return NextResponse.json({ error: "Failed to fetch user answers" }, { status: 500 })
    }

    // Get total questions in database
    const { data: allQuestions, error: questionsError } = await supabase.from("questions").select("id")

    if (questionsError) {
      console.error("Questions error:", questionsError)
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
    }

    const uniqueQuestionIds = new Set(userAnswers?.map((a) => a.question_id) || [])
    const totalUniqueQuestions = uniqueQuestionIds.size
    const totalQuestionsInDatabase = allQuestions?.length || 0
    const percentageAttempted =
      totalQuestionsInDatabase > 0 ? (totalUniqueQuestions / totalQuestionsInDatabase) * 100 : 0

    return NextResponse.json({
      uniqueQuestions: totalUniqueQuestions,
      totalQuestions: totalQuestionsInDatabase,
      percentageAttempted: Math.round(percentageAttempted * 10) / 10,
    })
  } catch (error) {
    console.error("Error fetching unique questions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
