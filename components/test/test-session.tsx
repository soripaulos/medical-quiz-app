"use client"

import { QuizInterface } from "@/components/quiz/quiz-interface"
import type { Question, UserSession, UserAnswer, UserQuestionProgress } from "@/lib/types"
import { getAnswerChoices } from "@/lib/types"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSession } from "@/hooks/use-session-store"

interface TestSessionProps {
  sessionId: string
}

export function TestSession({ sessionId }: TestSessionProps) {
  // Use our new session store instead of local state
  const {
    session,
    questions,
    userAnswers,
    userProgress,
    loading,
    error,
    updateAnswer,
    updateProgress
  } = useSession(sessionId)

  const handleAnswerSelect = async (questionId: string, choiceLetter: string) => {
    if (!session) return

    const question = questions.find((q) => q.id === questionId)
    const isCorrect = question?.correct_answer === choiceLetter

    // Create the answer object
    const newAnswer: UserAnswer = {
      id: `answer-${questionId}-${choiceLetter}`,
      question_id: questionId,
      selected_choice_letter: choiceLetter,
      is_correct: isCorrect,
      answered_at: new Date().toISOString(),
    }

    // Optimistically update the store
    updateAnswer(questionId, newAnswer)

    // Save answer to database
    try {
      const response = await fetch("/api/answers/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user_id,
          questionId,
          sessionId: session.id,
          selectedChoiceLetter: choiceLetter,
          isCorrect,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save answer")
      }
    } catch (error) {
      console.error("Error saving answer:", error)
      // TODO: Revert optimistic update on error
    }
  }

  const handleFlagQuestion = async (questionId: string) => {
    if (!session) return

    // Find existing progress or create new one
    const existingProgress = userProgress.find((p) => p.question_id === questionId)
    const newProgress: UserQuestionProgress = existingProgress
      ? { ...existingProgress, is_flagged: !existingProgress.is_flagged }
      : {
          id: `progress-${questionId}`,
          user_id: session.user_id,
          question_id: questionId,
          times_attempted: 0,
          times_correct: 0,
          is_flagged: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

    // Optimistically update the store
    updateProgress(questionId, newProgress)

    try {
      const response = await fetch("/api/progress/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user_id,
          questionId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to flag question")
      }
    } catch (error) {
      console.error("Error flagging question:", error)
      // TODO: Revert optimistic update on error
    }
  }

  const handleSaveNote = async (questionId: string, note: string) => {
    if (!session) return

    try {
      const response = await fetch("/api/notes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user_id,
          questionId,
          noteText: note,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save note")
      }
    } catch (error) {
      console.error("Error saving note:", error)
    }
  }

  const handlePauseSession = async () => {
    if (!session) return

    try {
      const response = await fetch(`/api/sessions/${sessionId}/pause`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to pause session")
      }
    } catch (error) {
      console.error("Error pausing session:", error)
    }
  }

  const handleEndSession = async () => {
    if (!session) return

    try {
      const response = await fetch(`/api/sessions/${sessionId}/end`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to end session")
      }

      // Redirect to results page
      window.location.href = `/test/${sessionId}/results`
    } catch (error) {
      console.error("Error ending session:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test session...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <AlertCircle className="w-12 h-12 mx-auto mb-2" />
            <h2 className="text-xl font-semibold">Error Loading Session</h2>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!session || !questions.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Not Found</h2>
          <p className="text-gray-600">The test session could not be found or contains no questions.</p>
        </div>
      </div>
    )
  }

  // Convert questions to include answer_choices array for compatibility
  const questionsWithChoices = questions.map((q) => ({
    ...q,
    answer_choices: getAnswerChoices(q),
  }))

  return (
    <QuizInterface
      session={session}
      questions={questionsWithChoices}
      userAnswers={userAnswers}
      userProgress={userProgress}
      onAnswerSelect={handleAnswerSelect}
      onFlagQuestion={handleFlagQuestion}
      onSaveNote={handleSaveNote}
      onPauseSession={handlePauseSession}
      onEndSession={handleEndSession}
    />
  )
}
