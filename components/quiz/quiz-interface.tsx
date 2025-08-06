"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Calculator, Flag, ChevronLeft, ChevronRight, Square, Beaker, StickyNote, Menu, Moon, Sun } from "lucide-react"
import { SourcesDisplay } from "@/components/ui/sources-display"
import { QuestionSidebar } from "./question-sidebar"
import { LabValuesModal } from "./lab-values-modal"
import { CalculatorModal } from "./calculator-modal"
import { NotesPanel } from "./notes-panel"
import { QuestionFeedback } from "./question-feedback"
import { AppLogo } from "@/components/ui/app-logo"
import type { Question, UserSession, UserAnswer, UserQuestionProgress, UserNote } from "@/lib/types"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTheme } from "next-themes"

interface QuizInterfaceProps {
  session: UserSession
  questions: Question[]
  userAnswers: UserAnswer[]
  userProgress: UserQuestionProgress[]
  onAnswerSelect: (questionId: string, choiceLetter: string) => void
  onFlagQuestion: (questionId: string) => void
  onSaveNote: (questionId: string, note: string) => void
  onPauseSession: () => void
  onEndSession: () => Promise<void>
  onCreateTest?: () => void
}

export function QuizInterface({
  session,
  questions,
  userAnswers,
  userProgress,
  onAnswerSelect,
  onFlagQuestion,
  onSaveNote,
  onPauseSession,
  onEndSession,
  onCreateTest,
}: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(session.current_question_index)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [showExplanations, setShowExplanations] = useState<Record<string, boolean>>({})
  const [showLabValues, setShowLabValues] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(session.time_remaining || 0)
  const [activeTime, setActiveTime] = useState(0)
  const [noteText, setNoteText] = useState("")
  const [showSubmitPrompt, setShowSubmitPrompt] = useState(false)
  const [localProgress, setLocalProgress] = useState<UserQuestionProgress[]>(userProgress)
  const [userNotes, setUserNotes] = useState<UserNote[]>([])

  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = userAnswers.find((a) => a.question_id === currentQuestion?.id)
  const currentProgress = localProgress.find((p) => p.question_id === currentQuestion?.id)
  const currentSelectedAnswer = selectedAnswers[currentQuestion?.id] || currentAnswer?.selected_choice_letter
  const showCurrentExplanation = showExplanations[currentQuestion?.id] || false
  const currentNote = userNotes.find((n) => n.question_id === currentQuestion?.id)

  // Start session activity tracking when component mounts
  useEffect(() => {
    const startSessionActivity = async () => {
      try {
        const response = await fetch(`/api/sessions/${session.id}/start`, {
          method: "POST",
        })
        if (!response.ok) {
          console.error("Failed to start session activity")
        }
      } catch (error) {
        console.error("Error starting session activity:", error)
      }
    }
    startSessionActivity()

    // Handle page visibility changes (tab switching, minimizing) - LESS AGGRESSIVE
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Only update last activity time, don't pause the session
        try {
          await fetch(`/api/sessions/${session.id}/active-time`, {
            method: "POST",
          })
        } catch (error) {
          console.error("Error updating activity time on visibility change:", error)
        }
      } else {
        // Page is visible, ensure session is active
        try {
          await fetch(`/api/sessions/${session.id}/resume`, {
            method: "POST",
          })
        } catch (error) {
          console.error("Error resuming session on visibility change:", error)
        }
      }
    }

    // Handle beforeunload event (browser close, page refresh, navigation) - ONLY FOR ACTUAL UNLOAD
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Only show warning if there are unsaved changes or if session is in progress
      if (session.is_active && !session.completed_at) {
        event.preventDefault()
        event.returnValue = "Are you sure you want to leave? Your test session is still active."
        return "Are you sure you want to leave? Your test session is still active."
      }
    }

    // Handle unload event as backup - ONLY PAUSE ON ACTUAL UNLOAD
    const handleUnload = () => {
      // Only pause if actually unloading (not just tab switching)
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`/api/sessions/${session.id}/pause`, JSON.stringify({}))
      }
    }

    // Add event listeners with less aggressive handling
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("unload", handleUnload)

    // Cleanup function - MINIMAL CLEANUP
    return () => {
      // Remove event listeners
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("unload", handleUnload)
      
      // Don't pause session on component unmount - let it stay active
      // Only update last activity time
      const updateActivityTime = async () => {
        try {
          await fetch(`/api/sessions/${session.id}/active-time`, {
            method: "POST",
          })
        } catch (error) {
          console.error("Error updating activity time:", error)
        }
      }
      updateActivityTime()
    }
  }, [session.id])

  // Add periodic heartbeat to keep session alive and prevent cleanup
  useEffect(() => {
    const heartbeatInterval = setInterval(async () => {
      try {
        // Send heartbeat to update last_activity_at and prevent session cleanup
        await fetch(`/api/sessions/${session.id}/active-time`, {
          method: "POST",
        })
      } catch (error) {
        console.error("Error sending session heartbeat:", error)
      }
    }, 30000) // Send heartbeat every 30 seconds

    return () => {
      clearInterval(heartbeatInterval)
    }
  }, [session.id])

  // Fetch user notes on component mount
  useEffect(() => {
    const fetchUserNotes = async () => {
      try {
        const response = await fetch(`/api/notes/get?session_id=${session.id}`)
        if (response.ok) {
          const data = await response.json()
          setUserNotes(data.notes || [])
        }
      } catch (error) {
        console.error("Error fetching notes:", error)
      }
    }
    fetchUserNotes()
  }, [session.id])

  // Update note text when question changes
  useEffect(() => {
    if (currentQuestion) {
      const note = userNotes.find((n) => n.question_id === currentQuestion.id)
      setNoteText(note?.note_text || "")
    }
  }, [currentQuestion, userNotes])

  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleAnswerSelect = (choiceLetter: string) => {
    const questionId = currentQuestion.id
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: choiceLetter }))
    onAnswerSelect(questionId, choiceLetter)

    if (session.session_type === "practice") {
      setShowExplanations((prev) => ({ ...prev, [questionId]: true }))
    }
  }

  const handleFlagQuestion = () => {
    if (!currentQuestion) return

    const questionId = currentQuestion.id
    onFlagQuestion(questionId)

    // Update local progress state immediately for UI feedback
    setLocalProgress((prev) => {
      const existingIndex = prev.findIndex((p) => p.question_id === questionId)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          is_flagged: !updated[existingIndex].is_flagged,
        }
        return updated
      } else {
        // Create new progress entry
        return [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            question_id: questionId,
            user_id: session.user_id,
            times_attempted: 0,
            times_correct: 0,
            is_flagged: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]
      }
    })
  }

  const handleSaveNote = (note: string) => {
    onSaveNote(currentQuestion.id, note)

    // Update local notes state
    setUserNotes((prev) => {
      const existingIndex = prev.findIndex((n) => n.question_id === currentQuestion.id)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = { ...updated[existingIndex], note_text: note }
        return updated
      } else {
        return [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            question_id: currentQuestion.id,
            user_id: session.user_id,
            note_text: note,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]
      }
    })
  }

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestionIndex(index)
    setSidebarOpen(false)
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  }

  const getAnswerChoices = (question: Question) => {
    const choices = []
    if (question.choice_a)
      choices.push({ letter: "A", text: question.choice_a, is_correct: question.correct_answer === "A" })
    if (question.choice_b)
      choices.push({ letter: "B", text: question.choice_b, is_correct: question.correct_answer === "B" })
    if (question.choice_c)
      choices.push({ letter: "C", text: question.choice_c, is_correct: question.correct_answer === "C" })
    if (question.choice_d)
      choices.push({ letter: "D", text: question.choice_d, is_correct: question.correct_answer === "D" })
    if (question.choice_e)
      choices.push({ letter: "E", text: question.choice_e, is_correct: question.correct_answer === "E" })
    if (question.choice_f)
      choices.push({ letter: "F", text: question.choice_f, is_correct: question.correct_answer === "F" })
    return choices
  }

  const getChoiceStyle = (choice: any, isSelected: boolean) => {
    // Before explanation is shown
    if (!showCurrentExplanation) {
      return isSelected ? "border-primary bg-primary/20" : "border-border hover:border-muted-foreground"
    }

    // After explanation is shown
    if (choice.is_correct) {
      return "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
    }
    if (isSelected && !choice.is_correct) {
      return "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
    }
    return "border-border bg-card"
  }

  const handleEndSession = async () => {
    await onEndSession()
    router.push(`/test/${session.id}/results`)
  }

  // Timer effect for exam mode (countdown)
  useEffect(() => {
    if (session.session_type === "exam" && session.time_limit && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            handleEndSession()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.session_type, session.time_limit, timeRemaining])

  // Active time tracking for practice mode (stopwatch)
  useEffect(() => {
    if (session.session_type === "practice") {
      const fetchActiveTime = async () => {
        try {
          const response = await fetch(`/api/sessions/${session.id}/active-time`)
          if (response.ok) {
            const data = await response.json()
            setActiveTime(data.activeTime || 0)
          }
        } catch (error) {
          console.error("Error fetching active time:", error)
        }
      }

      // Initial fetch
      fetchActiveTime()

      // Update active time every second
      const timer = setInterval(fetchActiveTime, 1000)
      return () => clearInterval(timer)
    }
  }, [session.session_type, session.id])

  const answeredQuestionIds = new Set([...userAnswers.map((a) => a.question_id), ...Object.keys(selectedAnswers)])
  const allQuestionsAnswered = questions.length > 0 && answeredQuestionIds.size >= questions.length

  useEffect(() => {
    if (allQuestionsAnswered) {
      setShowSubmitPrompt(true)
    }
  }, [allQuestionsAnswered])

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">No Questions Available</h2>
          <p className="text-gray-600">There are no questions to display in this session.</p>
          {onCreateTest && (
            <Button onClick={onCreateTest} className="mt-4">
              Create New Test
            </Button>
          )}
        </div>
      </div>
    )
  }

  const answerChoices = getAnswerChoices(currentQuestion)

  const getSubmitPromptDescription = () => {
    const answeredCount = answeredQuestionIds.size
    const totalCount = questions.length

    if (allQuestionsAnswered) {
      return session.session_type === "practice"
        ? "You have answered all questions. Would you like to submit and view your results?"
        : "You have answered all questions. Once you submit, you will not be able to change your answers."
    }

    return `You have answered ${answeredCount} of ${totalCount} questions. Are you sure you want to end the block and submit your current answers?`
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between p-2 border-b dark:bg-card bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:w-80">
              <QuestionSidebar
                questions={questions}
                currentIndex={currentQuestionIndex}
                onQuestionSelect={handleQuestionSelect}
                userAnswers={userAnswers}
                userProgress={localProgress}
                sessionType={session.session_type}
              />
            </SheetContent>
          </Sheet>
          <div className="text-sm font-medium">
            Item{" "}
            <span className="font-bold">
              {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
          <QuestionFeedback 
            question={currentQuestion} 
            sessionId={session.id} 
          />
          <Button variant="ghost" size="icon" onClick={handleFlagQuestion}>
            <Flag
              className={`h-5 w-5 ${currentProgress?.is_flagged ? "text-yellow-500 fill-current" : ""}`}
            />
            <span className="sr-only">Flag</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowLabValues(true)}>
            <Beaker className="h-5 w-5" />
            <span className="sr-only">Lab Values</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowNotes(!showNotes)} className="relative">
            <StickyNote className="h-5 w-5" />
            {currentNote && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></div>
            )}
            <span className="sr-only">Notes</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowCalculator(true)}>
            <Calculator className="h-5 w-5" />
            <span className="sr-only">Calculator</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Question */}
          <Card>
            <CardContent className="p-6">
              {/* Question metadata */}
              {(currentQuestion.year || currentQuestion.exam_type) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {currentQuestion.year && (
                    <Badge variant="secondary" className="text-xs font-medium">
                      Year {currentQuestion.year}
                    </Badge>
                  )}
                  {currentQuestion.exam_type && (
                    <Badge variant="outline" className="text-xs font-medium">
                      {currentQuestion.exam_type.name}
                    </Badge>
                  )}
                </div>
              )}
              <p className="text-lg leading-relaxed">{currentQuestion.question_text}</p>
              {currentQuestion.question_image_url && (
                <img
                  src={currentQuestion.question_image_url || "/placeholder.svg"}
                  alt="Question image"
                  className="max-w-full h-auto rounded-lg"
                />
              )}
            </CardContent>
          </Card>

          {/* Answer Choices */}
          <div className="space-y-3">
            {answerChoices.map((choice) => {
              const isSelected = currentSelectedAnswer === choice.letter
              return (
                <Card
                  key={choice.letter}
                  onClick={() => !showCurrentExplanation && handleAnswerSelect(choice.letter)}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${getChoiceStyle(
                    choice,
                    isSelected,
                  )}`}
                >
                  <div className="flex items-center">
                    <Badge
                      variant="outline"
                      className="mr-4 text-base font-bold w-8 h-8 flex items-center justify-center"
                    >
                      {choice.letter}
                    </Badge>
                    <p>{choice.text}</p>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Explanation */}
          {showCurrentExplanation && currentQuestion && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2">Explanation</h3>
                <div className="prose dark:prose-invert max-w-none">
                  <p>{currentQuestion.explanation}</p>
                  {currentQuestion.explanation_image_url && (
                    <img
                      src={currentQuestion.explanation_image_url}
                      alt="Explanation"
                      className="mt-4 rounded-lg max-w-full h-auto"
                    />
                  )}
                </div>
                {currentQuestion.sources && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold text-sm mb-2">Sources:</h4>
                    <SourcesDisplay sources={currentQuestion.sources} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between p-2 border-t dark:bg-card bg-primary text-primary-foreground">
        <Button variant="ghost" onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0}>
          <ChevronLeft className="h-5 w-5 mr-1" />
          Previous
        </Button>
        <Button variant="ghost" onClick={handleNextQuestion} disabled={currentQuestionIndex === questions.length - 1}>
          Next
          <ChevronRight className="h-5 w-5 ml-1" />
        </Button>
        <div className="flex items-center gap-4">
          {session.session_type === "exam" && session.time_limit && (
            <span className="text-sm">Time remaining: {formatTime(timeRemaining)}</span>
          )}
          {session.session_type === "practice" && (
            <span className="text-sm">Time spent: {formatTime(activeTime)}</span>
          )}
          <Button variant="destructive" size="sm" onClick={() => setShowSubmitPrompt(true)}>
            <Square className="w-4 h-4 mr-1" />
            End Block
          </Button>
        </div>
      </footer>

      <AlertDialog open={showSubmitPrompt} onOpenChange={setShowSubmitPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you ready to submit?</AlertDialogTitle>
            <AlertDialogDescription>{getSubmitPromptDescription()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndSession}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modals */}
      <LabValuesModal open={showLabValues} onOpenChange={setShowLabValues} />
      <CalculatorModal open={showCalculator} onOpenChange={setShowCalculator} />

      {/* Notes Panel (Drawer for mobile, sidebar for desktop) */}
      <Sheet open={showNotes} onOpenChange={setShowNotes}>
        <SheetContent className="w-full sm:max-w-md">
          <NotesPanel
            questionId={currentQuestion.id}
            noteText={noteText}
            onNoteChange={setNoteText}
            onSaveNote={handleSaveNote}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}
