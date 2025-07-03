"use client"

import { useEffect } from "react"
import { AlertCircle } from "lucide-react"
import { QuizInterface } from "@/components/quiz/quiz-interface"
import { getAnswerChoices } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { useSessionStore } from "@/stores/use-session-store"

interface TestSessionProps {
  sessionId: string
}

export function TestSession({ sessionId }: TestSessionProps) {
  const {
    session,
    questions,
    userAnswers,
    userProgress,
    loading,
    error,
    fetchSessionData,
    initializeRealtime,
  } = useSessionStore()

  useEffect(() => {
    fetchSessionData(sessionId)

    const cleanup = initializeRealtime(sessionId)
    return cleanup
  }, [sessionId, fetchSessionData, initializeRealtime])

  const handleAnswerSelect = async (questionId: string, choiceLetter: string) => {
    if (!session) return

    const question = questions.find((q) => q.id === questionId)
    const isCorrect = question?.correct_answer === choiceLetter

    // The store will be updated via real-time subscription,
    // but we send the update to the server here.
    try {
      await fetch("/api/answers/save", {
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
    } catch (error) {
      console.error("Error saving answer:", error)
    }
  }

  const handleFlagQuestion = async (questionId: string) => {
    if (!session) return

    try {
      await fetch("/api/progress/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user_id,
          questionId,
        }),
      })
    } catch (error) {
      console.error("Error flagging question:", error)
    }
  }

  const handleSaveNote = async (questionId: string, note: string) => {
    if (!session) return

    try {
      await fetch("/api/notes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user_id,
          questionId,
          noteText: note,
        }),
      })
    } catch (error) {
      console.error("Error saving note:", error)
    }
  }

  const handlePauseSession = async () => {
    if (!session) return

    try {
      await fetch(`/api/sessions/${sessionId}/pause`, {
        method: "POST",
      })
    } catch (error) {
      console.error("Error pausing session:", error)
    }
  }

  const handleEndSession = async () => {
    if (!session) return

    try {
      await fetch(`/api/sessions/${sessionId}/end`, {
        method: "POST",
      })
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
