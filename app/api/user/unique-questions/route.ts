import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifySession } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const userSession = await verifySession()
    
    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Get all user answers to find unique questions attempted
    const { data: userAnswers, error: answersError } = await supabase
      .from("user_answers")
      .select("question_id")
      .eq("user_id", userSession.user.id)

    if (answersError) {
      console.error("Answers error:", answersError)
      return NextResponse.json({ error: "Failed to fetch user answers" }, { status: 500 })
    }

    // Get total questions in database
    const { data: allQuestions, error: questionsError } = await supabase
      .from("questions")
      .select("id")

    if (questionsError) {
      console.error("Questions error:", questionsError)
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
    }

    const uniqueQuestionIds = new Set(userAnswers?.map((a: any) => a.question_id) || [])
    const totalUniqueQuestions = uniqueQuestionIds.size
    const totalQuestionsInDatabase = allQuestions?.length || 0
    const percentageAttempted =
      totalQuestionsInDatabase > 0 ? Math.round((totalUniqueQuestions / totalQuestionsInDatabase) * 100) : 0

    return NextResponse.json({
      totalUniqueQuestions,
      totalQuestionsInDatabase,
      percentageAttempted,
      remainingQuestions: totalQuestionsInDatabase - totalUniqueQuestions,
    })
  } catch (error) {
    console.error("Error fetching unique questions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
