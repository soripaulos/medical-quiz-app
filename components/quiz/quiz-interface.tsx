"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Calculator, Flag, ChevronLeft, ChevronRight, Square, Beaker, StickyNote, Menu, Moon, Sun } from "lucide-react"
import { QuestionSidebar } from "./question-sidebar"
import { LabValuesModal } from "./lab-values-modal"
import { CalculatorModal } from "./calculator-modal"
import { NotesPanel } from "./notes-panel"
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

// Custom hook for debouncing
function useDebounce(value: any, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  return debouncedValue
}

interface QuizInterfaceProps {
  session: UserSession
  questions: Question[]
  userAnswers: UserAnswer[]
  userProgress: UserQuestionProgress[]
  onAnswerSelect: (questionId: string, choiceLetter: string) => void
  onFlagQuestion: (questionId: string) => void
  onSaveNote: (questionId: string, note: string) => void
  onPauseSession: () => void
  onEndSession: () => void
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
  const [noteText, setNoteText] = useState("")
  const [showSubmitPrompt, setShowSubmitPrompt] = useState(false)
  const [localProgress, setLocalProgress] = useState<UserQuestionProgress[]>(userProgress)
  const [userNotes, setUserNotes] = useState<UserNote[]>([])

  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const debouncedState = useDebounce(
    {
      currentQuestionIndex,
      selectedAnswers,
      showExplanations,
      timeRemaining,
      localProgress,
      userNotes,
    },
    500
  )

  // Load state from localStorage on initial render
  useEffect(() => {
    const cachedData = localStorage.getItem(`session_${session.id}`)
    if (cachedData) {
      try {
        const data = JSON.parse(cachedData)
        if (data.quizState) {
          setCurrentQuestionIndex(data.quizState.currentQuestionIndex ?? session.current_question_index)
          setSelectedAnswers(data.quizState.selectedAnswers ?? {})
          setShowExplanations(data.quizState.showExplanations ?? {})
          setTimeRemaining(data.quizState.timeRemaining ?? session.time_remaining)
          setLocalProgress(data.quizState.localProgress ?? userProgress)
          setUserNotes(data.quizState.userNotes ?? [])
        }
      } catch (e) {
        console.error("Failed to parse cached quiz state", e)
      }
    }
  }, [session.id]) // Only run once per session

  // Save state to localStorage on change
  useEffect(() => {
    const cachedData = localStorage.getItem(`session_${session.id}`)
    let dataToSave = {}
    if (cachedData) {
      try {
        dataToSave = JSON.parse(cachedData)
      } catch (e) {
        // ignore parsing error, will overwrite with fresh state
      }
    }
    const updatedData = { ...dataToSave, quizState: debouncedState }
    localStorage.setItem(`session_${session.id}`, JSON.stringify(updatedData))
  }, [debouncedState, session.id])

  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = userAnswers.find((a) => a.question_id === currentQuestion?.id)
  const currentProgress = localProgress.find((p) => p.question_id === currentQuestion?.id)
  const currentSelectedAnswer = selectedAnswers[currentQuestion?.id] || currentAnswer?.selected_choice_letter
  const showCurrentExplanation = showExplanations[currentQuestion?.id] || false
  const currentNote = userNotes.find((n) => n.question_id === currentQuestion?.id)

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

  const handleEndSession = () => {
    onEndSession()
    router.push(`/test/${session.id}/results`)
  }

  // Timer effect
  useEffect(() => {
    if (session.time_limit && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            onEndSession()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [timeRemaining, session.time_limit, onEndSession])

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
    <div className="flex flex-col h-screen bg-muted/40">
      <header className="sticky top-0 z-10 bg-blue-600 dark:bg-gray-800 text-primary-foreground shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center space-x-2 md:space-x-4">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="secondary" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full sm:w-80">
                  <QuestionSidebar
                    questions={questions}
                    currentIndex={currentQuestionIndex}
                    onQuestionSelect={handleQuestionSelect}
                    userAnswers={userAnswers}
                    userProgress={localProgress}
                  />
                </SheetContent>
              </Sheet>
              <span className="font-semibold text-lg whitespace-nowrap hidden md:block">
                Item {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
            {session.time_limit && (
              <Badge variant="secondary" className="text-lg">
                {formatTime(timeRemaining)}
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-1 md:space-x-2">
            <Button variant="secondary" size="icon" onClick={() => setShowCalculator(true)}>
              <Calculator className="h-5 w-5" />
            </Button>
            <Button variant="secondary" size="icon" onClick={() => setShowLabValues(true)}>
              <Beaker className="h-5 w-5" />
            </Button>
            <Button
              variant={currentProgress?.is_flagged ? "destructive" : "secondary"}
              size="icon"
              onClick={handleFlagQuestion}
            >
              <Flag className="h-5 w-5" />
            </Button>
            <Button variant="secondary" size="icon" onClick={() => setShowNotes(!showNotes)}>
              <StickyNote className="h-5 w-5" />
            </Button>
            <Button variant="secondary" size="icon" onClick={toggleDarkMode}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Question */}
          <Card>
            <CardContent className="p-6">
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
                    <h4 className="font-semibold text-sm">Sources:</h4>
                    <p className="text-sm text-muted-foreground italic">{currentQuestion.sources}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <footer className="bg-blue-600 dark:bg-gray-800 border-t-0 text-primary-foreground p-2">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <Button
              variant="secondary"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="hidden md:flex items-center space-x-2">
              <Button variant="secondary" onClick={() => setShowSubmitPrompt(true)}>
                End Block
              </Button>
            </div>
            <Button
              variant="secondary"
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
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
      {showLabValues && <LabValuesModal open={showLabValues} onOpenChange={setShowLabValues} />}
      {showCalculator && <CalculatorModal open={showCalculator} onClose={() => setShowCalculator(false)} />}

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
  if (seconds <= 0) return "00:00"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}
