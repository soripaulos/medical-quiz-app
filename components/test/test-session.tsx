"use client"

import { useEffect, useRef, useState } from "react"
import { QuizInterface } from "@/components/quiz/quiz-interface"
import type { Question, UserSession, UserAnswer, UserQuestionProgress } from "@/lib/types"
import { getAnswerChoices } from "@/lib/types"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSession } from "@/hooks/use-session-store"
import { useRouter } from "next/navigation"

interface TestSessionProps {
  sessionId: string
}

export function TestSession({ sessionId }: TestSessionProps) {
  const router = useRouter()
  const [isRecovering, setIsRecovering] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const sessionPersistenceRef = useRef<NodeJS.Timeout | null>(null)
  const recoveryAttemptRef = useRef<number>(0)
  
  // Use our session store
  const {
    session,
    questions,
    userAnswers,
    userProgress,
    loading,
    error,
    updateAnswer,
    updateProgress,
    loadSession
  } = useSession(sessionId)

  // Enhanced session persistence with recovery mechanisms
  useEffect(() => {
    if (session && !loading) {
      // Store comprehensive session info for recovery
      const sessionData = {
        sessionId: session.id,
        sessionName: session.session_name,
        sessionType: session.session_type,
        startTime: Date.now(),
        url: window.location.href,
        lastActivity: Date.now(),
        currentQuestionIndex: session.current_question_index,
        isActive: session.is_active,
        timeRemaining: session.time_remaining,
        timeLimit: session.time_limit,
        activeTimeSeconds: session.active_time_seconds || 0,
        sessionStartedAt: session.session_started_at,
        lastActivityAt: session.last_activity_at
      }
      
      localStorage.setItem('activeTestSession', JSON.stringify(sessionData))
      localStorage.setItem(`session_${sessionId}_backup`, JSON.stringify(sessionData))
      
      // Set up periodic session data backup
      if (sessionPersistenceRef.current) {
        clearInterval(sessionPersistenceRef.current)
      }
      
      sessionPersistenceRef.current = setInterval(() => {
        const updatedData = {
          ...sessionData,
          lastActivity: Date.now(),
          currentQuestionIndex: session.current_question_index,
          timeRemaining: session.time_remaining,
          activeTimeSeconds: session.active_time_seconds || 0,
          lastActivityAt: session.last_activity_at
        }
        localStorage.setItem('activeTestSession', JSON.stringify(updatedData))
        localStorage.setItem(`session_${sessionId}_backup`, JSON.stringify(updatedData))
      }, 10000) // Update every 10 seconds
    }
    
    return () => {
      if (sessionPersistenceRef.current) {
        clearInterval(sessionPersistenceRef.current)
      }
    }
  }, [session, loading, sessionId])

  // Enhanced session recovery with retry logic
  useEffect(() => {
    const performSessionRecovery = async () => {
      const storedSession = localStorage.getItem('activeTestSession')
      const backupSession = localStorage.getItem(`session_${sessionId}_backup`)
      
      if (storedSession || backupSession) {
        try {
          const sessionData = JSON.parse(storedSession || backupSession!)
          if (sessionData.sessionId === sessionId) {
            console.log('Recovering test session:', sessionData.sessionName)
            setIsRecovering(true)
            
            // Attempt to resume the session
            try {
              await fetch(`/api/sessions/${sessionId}/resume`, {
                method: "POST",
              })
            } catch (resumeError) {
              console.warn("Could not resume session, but continuing with recovery:", resumeError)
            }
            
            setIsRecovering(false)
          }
        } catch (error) {
          console.error('Error parsing stored session:', error)
          setIsRecovering(false)
        }
      }
    }
    
    performSessionRecovery()
  }, [sessionId])

  // Enhanced error recovery with exponential backoff
  useEffect(() => {
    if (error && !loading) {
      setLastError(error)
      
      // Implement exponential backoff for retry attempts
      const retryDelay = Math.min(1000 * Math.pow(2, recoveryAttemptRef.current), 30000)
      
      if (recoveryAttemptRef.current < 5) { // Max 5 retry attempts
        console.log(`Attempting session recovery in ${retryDelay}ms (attempt ${recoveryAttemptRef.current + 1})`)
        
        const retryTimer = setTimeout(async () => {
          recoveryAttemptRef.current++
          setRetryCount(prev => prev + 1)
          
          try {
            await loadSession(sessionId)
            // If successful, reset retry count
            recoveryAttemptRef.current = 0
            setLastError(null)
          } catch (retryError) {
            console.error('Retry failed:', retryError)
          }
        }, retryDelay)
        
        return () => clearTimeout(retryTimer)
      }
    }
  }, [error, loading, sessionId, loadSession])

  // Prevent page unload during active sessions
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (session && session.is_active && !session.completed_at) {
        event.preventDefault()
        event.returnValue = "Your test session is still active. Are you sure you want to leave?"
        return "Your test session is still active. Are you sure you want to leave?"
      }
    }

    // Add page visibility change handler for better session persistence
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Update last activity time when page becomes hidden
        const sessionData = localStorage.getItem('activeTestSession')
        if (sessionData) {
          try {
            const data = JSON.parse(sessionData)
            data.lastActivity = Date.now()
            localStorage.setItem('activeTestSession', JSON.stringify(data))
          } catch (error) {
            console.error('Error updating session activity:', error)
          }
        }
      } else {
        // Page is visible again, ensure session is still active
        if (session && session.is_active) {
          fetch(`/api/sessions/${sessionId}/resume`, {
            method: "POST",
          }).catch(error => {
            console.warn('Could not resume session on visibility change:', error)
          })
        }
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [session, sessionId])

  // Resume session activity when component mounts
  useEffect(() => {
    const resumeSession = async () => {
      if (session && session.is_paused) {
        try {
          const response = await fetch(`/api/sessions/${sessionId}/resume`, {
            method: "POST",
          })
          if (!response.ok) {
            console.warn("Could not resume session activity, but continuing")
          }
        } catch (error) {
          console.warn("Error resuming session activity, but continuing:", error)
        }
      }
    }
    resumeSession()
  }, [session, sessionId])

  const handleAnswerSelect = async (questionId: string, choiceLetter: string) => {
    if (!session) return

    const question = questions.find((q) => q.id === questionId)
    const isCorrect = question?.correct_answer === choiceLetter

    // Create the answer object
    const newAnswer: UserAnswer = {
      id: `answer-${questionId}-${choiceLetter}`,
      question_id: questionId,
      session_id: sessionId,
      selected_choice_letter: choiceLetter,
      is_correct: isCorrect,
      answered_at: new Date().toISOString(),
    }

    // Update local state immediately for better UX
    updateAnswer(questionId, newAnswer)

    // Update progress with correct UserQuestionProgress structure
    const existingProgress = userProgress.find((p) => p.question_id === questionId)
    const newProgress: UserQuestionProgress = {
      id: existingProgress?.id || `progress-${questionId}`,
      question_id: questionId,
      times_attempted: (existingProgress?.times_attempted || 0) + 1,
      times_correct: (existingProgress?.times_correct || 0) + (isCorrect ? 1 : 0),
      is_flagged: existingProgress?.is_flagged || false,
      last_attempted: new Date().toISOString(),
      user_id: session.user_id,
      created_at: existingProgress?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    updateProgress(questionId, newProgress)

    // Persist to server
    try {
      const response = await fetch(`/api/sessions/${sessionId}/answers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_id: questionId,
          selected_choice_letter: choiceLetter,
          is_correct: isCorrect,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save answer")
      }
    } catch (error) {
      console.error("Error saving answer:", error)
      // Don't show error to user, answer is saved locally
    }
  }

  const handleFlagQuestion = async (questionId: string) => {
    if (!session) return

    const currentProgress = userProgress.find((p) => p.question_id === questionId)
    const newFlaggedState = !currentProgress?.is_flagged

    // Update local state immediately with correct UserQuestionProgress structure
    const newProgress: UserQuestionProgress = {
      id: currentProgress?.id || `progress-${questionId}`,
      question_id: questionId,
      times_attempted: currentProgress?.times_attempted || 0,
      times_correct: currentProgress?.times_correct || 0,
      is_flagged: newFlaggedState,
      last_attempted: currentProgress?.last_attempted,
      user_id: session.user_id,
      created_at: currentProgress?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    updateProgress(questionId, newProgress)

    // Persist to server
    try {
      const response = await fetch(`/api/sessions/${sessionId}/flag`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_id: questionId,
          is_flagged: newFlaggedState,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update flag")
      }
    } catch (error) {
      console.error("Error updating flag:", error)
      // Don't show error to user, flag is saved locally
    }
  }

  const handleSaveNote = async (questionId: string, note: string) => {
    try {
      const response = await fetch(`/api/notes/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_id: questionId,
          session_id: sessionId,
          note_text: note,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save note")
      }
    } catch (error) {
      console.error("Error saving note:", error)
      // Don't show error to user for notes
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
      // Don't show error to user, session state is maintained locally
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

      // Clean up localStorage when session is properly ended
      localStorage.removeItem('activeTestSession')
      localStorage.removeItem(`session_${sessionId}_backup`)

      // Use Next.js router for navigation to preserve client-side state
      router.push(`/test/${sessionId}/results`)
    } catch (error) {
      console.error("Error ending session:", error)
      // Still navigate to results even if there was an error
      localStorage.removeItem('activeTestSession')
      localStorage.removeItem(`session_${sessionId}_backup`)
      router.push(`/test/${sessionId}/results`)
    }
  }

  const handleRetry = async () => {
    setIsRecovering(true)
    recoveryAttemptRef.current = 0
    setRetryCount(0)
    setLastError(null)
    
    try {
      await loadSession(sessionId)
    } catch (error) {
      console.error("Manual retry failed:", error)
    } finally {
      setIsRecovering(false)
    }
  }

  if (loading || isRecovering) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isRecovering ? "Recovering test session..." : "Loading test session..."}
          </p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Retry attempt {retryCount}/5
            </p>
          )}
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
            <h2 className="text-xl font-semibold">Session Connection Issue</h2>
          </div>
          <p className="text-gray-600 mb-4">
            {lastError || error}
          </p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-500 mb-4">
              Attempted {retryCount} automatic recoveries
            </p>
          )}
          <div className="space-y-2">
            <Button 
              onClick={handleRetry} 
              disabled={isRecovering}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {isRecovering ? "Retrying..." : "Retry Connection"}
            </Button>
            <Button onClick={() => router.push('/')} variant="outline" className="w-full">
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!session || !questions.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Not Found</h2>
          <p className="text-gray-600 mb-4">The test session could not be found or contains no questions.</p>
          <div className="space-y-2">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Loading Session
            </Button>
            <Button onClick={() => router.push('/')} variant="outline" className="w-full">
              Go to Home
            </Button>
          </div>
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
