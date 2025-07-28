import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifySession } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    // Authenticate user first
    const userSession = await verifySession()
    
    if (!userSession) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const { sessionId } = await context.params

    // Fetch session details with stored metrics
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      console.error("Session error:", sessionError)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Fetch session questions with details
    const { data: sessionQuestions, error: questionsError } = await supabase
      .from("session_questions")
      .select(`
        question_order,
        questions (
          id,
          question_text,
          choice_a,
          choice_b,
          choice_c,
          choice_d,
          choice_e,
          choice_f,
          correct_answer,
          explanation,
          explanation_image_url,
          sources,
          difficulty,
          year,
          specialties (id, name),
          exam_types (id, name)
        )
      `)
      .eq("session_id", sessionId)
      .order("question_order")

    if (questionsError) {
      console.error("Questions error:", questionsError)
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
    }

    const questions =
      sessionQuestions?.map((sq: any) => ({
        ...sq.questions,
        specialty: sq.questions.specialties,
        exam_type: sq.questions.exam_types,
      })) || []

    // Fetch user answers for this session
    const { data: userAnswers, error: answersError } = await supabase
      .from("user_answers")
      .select("*")
      .eq("session_id", sessionId)
      .order("answered_at")

    if (answersError) {
      console.error("Answers error:", answersError)
    }

    // Fetch user progress for flagged questions
    const { data: userProgress, error: progressError } = await supabase
      .from("user_question_progress")
      .select("*")
      .eq("user_id", session.user_id)
      .in(
        "question_id",
        questions.map((q: any) => q.id),
      )

    if (progressError) {
      console.error("Progress error:", progressError)
    }

    // Get fresh active time using the database function
    const { data: activeTime, error: timeError } = await supabase.rpc('calculate_session_active_time', {
      session_id: sessionId
    })

    if (timeError) {
      console.error("Time calculation error:", timeError)
    }

    // Use the calculated active time from the database function, fallback to stored value
    const finalActiveTime = activeTime || session.active_time_seconds || 0

    // Calculate statistics
    const totalQuestions = questions.length
    const answeredQuestions = userAnswers?.length || 0
    const correctAnswers = userAnswers?.filter((answer: any) => answer.is_correct).length || 0
    const incorrectAnswers = answeredQuestions - correctAnswers
    const unansweredQuestions = totalQuestions - answeredQuestions
    const scorePercentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

    // Group questions by specialty for detailed breakdown
    const specialtyBreakdown = questions.reduce((acc: any, question: any) => {
      const specialtyName = question.specialty?.name || "Unknown"
      if (!acc[specialtyName]) {
        acc[specialtyName] = {
          total: 0,
          correct: 0,
          incorrect: 0,
          unanswered: 0,
        }
      }
      acc[specialtyName].total++

      const userAnswer = userAnswers?.find((answer: any) => answer.question_id === question.id)
      if (userAnswer) {
        if (userAnswer.is_correct) {
          acc[specialtyName].correct++
        } else {
          acc[specialtyName].incorrect++
        }
      } else {
        acc[specialtyName].unanswered++
      }

      return acc
    }, {})

    // Group questions by difficulty for analysis
    const difficultyBreakdown = questions.reduce((acc: any, question: any) => {
      const difficulty = question.difficulty || "Unknown"
      if (!acc[difficulty]) {
        acc[difficulty] = {
          total: 0,
          correct: 0,
          incorrect: 0,
          unanswered: 0,
        }
      }
      acc[difficulty].total++

      const userAnswer = userAnswers?.find((answer: any) => answer.question_id === question.id)
      if (userAnswer) {
        if (userAnswer.is_correct) {
          acc[difficulty].correct++
        } else {
          acc[difficulty].incorrect++
        }
      } else {
        acc[difficulty].unanswered++
      }

      return acc
    }, {})

    // Prepare question details with user answers and progress
    const questionsWithAnswers = questions.map((question: any) => {
      const userAnswer = userAnswers?.find((answer: any) => answer.question_id === question.id)
      const progress = userProgress?.find((p: any) => p.question_id === question.id)

      return {
        ...question,
        userAnswer: userAnswer || null,
        isFlagged: progress?.is_flagged || false,
        timeSpent: userAnswer?.time_spent || 0,
      }
    })

    // Calculate time-based metrics
    const averageTimePerQuestion = answeredQuestions > 0 ? Math.round(finalActiveTime / answeredQuestions) : 0
    const totalTimeFormatted = formatTime(finalActiveTime)

    // Performance insights
    const insights = generatePerformanceInsights({
      scorePercentage,
      averageTimePerQuestion,
      specialtyBreakdown,
      difficultyBreakdown,
      session,
    })

    return NextResponse.json({
      session: {
        ...session,
        active_time_seconds: finalActiveTime,
        formatted_time: totalTimeFormatted,
      },
      statistics: {
        totalQuestions,
        answeredQuestions,
        correctAnswers,
        incorrectAnswers,
        unansweredQuestions,
        scorePercentage,
        averageTimePerQuestion,
        totalTimeSeconds: finalActiveTime,
        totalTimeFormatted,
      },
      breakdown: {
        bySpecialty: specialtyBreakdown,
        byDifficulty: difficultyBreakdown,
      },
      questions: questionsWithAnswers,
      insights,
    })
  } catch (error) {
    console.error("Error fetching session results:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  } else {
    return `${remainingSeconds}s`
  }
}

function generatePerformanceInsights(data: {
  scorePercentage: number
  averageTimePerQuestion: number
  specialtyBreakdown: any
  difficultyBreakdown: any
  session: any
}): string[] {
  const insights: string[] = []
  const { scorePercentage, averageTimePerQuestion, specialtyBreakdown, difficultyBreakdown } = data

  // Score-based insights
  if (scorePercentage >= 80) {
    insights.push("Excellent performance! You demonstrated strong knowledge across the topics.")
  } else if (scorePercentage >= 60) {
    insights.push("Good performance with room for improvement in some areas.")
  } else {
    insights.push("Consider reviewing the topics covered to strengthen your understanding.")
  }

  // Time-based insights
  if (averageTimePerQuestion < 60) {
    insights.push("You answered questions quickly. Consider taking more time to carefully read each question.")
  } else if (averageTimePerQuestion > 180) {
    insights.push("You took time to carefully consider each question, which is good for learning.")
  }

  // Specialty-based insights
  const specialties = Object.entries(specialtyBreakdown)
  const weakSpecialties = specialties.filter(([_, data]: [string, any]) => {
    const accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0
    return accuracy < 50 && data.total >= 3
  })

  if (weakSpecialties.length > 0) {
    const specialtyNames = weakSpecialties.map(([name]) => name).join(", ")
    insights.push(`Focus on improving in: ${specialtyNames}`)
  }

  // Difficulty-based insights
  const difficulties = Object.entries(difficultyBreakdown)
  const strugglingDifficulties = difficulties.filter(([_, data]: [string, any]) => {
    const accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0
    return accuracy < 40 && data.total >= 2
  })

  if (strugglingDifficulties.length > 0) {
    insights.push("Consider practicing more challenging questions to improve your problem-solving skills.")
  }

  return insights
}
