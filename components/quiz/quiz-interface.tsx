"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Calculator, Flag, ChevronLeft, ChevronRight, Square, Beaker, StickyNote, Menu, Moon, Sun, Timer, Book } from "lucide-react"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useTheme } from "next-themes"
import { useToast } from "@/components/ui/use-toast"
import { useUser } from "@supabase/auth-helpers-react"
import { Skeleton } from "@/components/ui/skeleton"

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
  onQuestionChange: (questionId: string, index: number) => void
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
  onQuestionChange,
}: QuizInterfaceProps) {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const user = useUser()

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    session.current_question_index ?? 0
  )
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(() => {
    const initialAnswers: Record<string, string> = {}
    userAnswers.forEach((answer) => {
      initialAnswers[answer.question_id] = answer.selected_choice_letter
    })
    return initialAnswers
  })
  const [showExplanations, setShowExplanations] = useState<Record<string, boolean>>({})
  const [showLabValues, setShowLabValues] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(session.time_remaining ?? 0)
  const [noteText, setNoteText] = useState("")
  const [showSubmitPrompt, setShowSubmitPrompt] = useState(false)
  const [localProgress, setLocalProgress] = useState<UserQuestionProgress[]>(userProgress)
  const [userNotes, setUserNotes] = useState<UserNote[]>([])
  const [isLabModalOpen, setIsLabModalOpen] = useState(false)
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false)
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(false)

  const router = useRouter()

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

  // Persist state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stateToSave = {
        currentQuestionIndex,
        selectedAnswers,
        showExplanations,
        timeRemaining,
      }
      localStorage.setItem(`quizSession_${session.id}`, JSON.stringify(stateToSave))
    }
  }, [currentQuestionIndex, selectedAnswers, showExplanations, timeRemaining, session.id])

  // Hydrate state from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem(`quizSession_${session.id}`)
      if (savedState) {
        try {
          const restoredState = JSON.parse(savedState)
          setCurrentQuestionIndex(restoredState.currentQuestionIndex ?? session.current_question_index ?? 0)
          setSelectedAnswers(restoredState.selectedAnswers ?? {})
          setShowExplanations(restoredState.showExplanations ?? {})
          setTimeRemaining(restoredState.timeRemaining ?? session.time_remaining ?? 0)
        } catch (error) {
          console.error("Failed to parse saved quiz state:", error)
          // Clear corrupted state
          localStorage.removeItem(`quizSession_${session.id}`)
        }
      }
    }
  }, [session.id, session.current_question_index, session.time_remaining])

  // Timer effect
  useEffect(() => {
    if (session.time_limit) {
      const timer = setInterval(() => {
        setTimeRemaining((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer)
            handleEndSession()
            return 0
          }
          return prevTime - 1
        })
      }, 1000)

      if (timeRemaining <= 0) {
        return () => clearInterval(timer)
      }
    }
  }, [timeRemaining, session.time_limit])

  const answeredQuestionIds = new Set([...userAnswers.map((a) => a.question_id), ...Object.keys(selectedAnswers)])
  const allQuestionsAnswered = questions.length > 0 && answeredQuestionIds.size >= questions.length

  useEffect(() => {
    if (allQuestionsAnswered) {
      setShowSubmitPrompt(true)
    }
  }, [allQuestionsAnswered])

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

    toast({
      title: "Question Flagged",
      description: "This question has been flagged for review.",
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
    onQuestionChange(questions[index].id, index)
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
    if (typeof window !== "undefined") {
      localStorage.removeItem(`quizSession_${session.id}`)
    }
    toast({
      title: "Session Ended",
      description: "Your quiz session has been successfully ended.",
    })
  }

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

  const headerFooterStyles = theme === "dark"
    ? "bg-card text-card-foreground"
    : "bg-blue-600 text-white"

  return (
    <div className={`flex flex-col h-screen ${theme === "dark" ? "dark" : ""}`}>
      {/* Header */}
      <header
        className={`flex items-center justify-between p-4 shadow-md ${headerFooterStyles}`}
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">
            Item {currentQuestionIndex + 1} of {questions.length}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {session.time_limit && (
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              <span className="font-semibold">{formatTime(timeRemaining)}</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleFlagQuestion}>
            <Flag
              className={`h-5 w-5 ${currentProgress?.is_flagged ? "text-yellow-500 fill-current" : ""}`}
            />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowLabValues(true)}>
            <Beaker className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowNotes(!showNotes)}>
            <StickyNote className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowCalculator(true)}>
            <Calculator className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
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

      {/* Footer */}
      <div className={`p-4 shadow-md ${headerFooterStyles}`}>
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <Button
            variant="outline"
            size="sm"
            className="text-white hover:bg-blue-700"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <div className="flex-grow text-center">
            {session.session_type !== "exam" && currentSelectedAnswer && (
              <Button onClick={() => setShowExplanations({ [currentQuestion.id]: !showCurrentExplanation })}>
                {showCurrentExplanation ? "Hide Explanation" : "Show Explanation"}
              </Button>
            )}
          </div>
          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleEndSession}
            >
              End Block
            </Button>
          ) : (
            <Button onClick={handleNextQuestion}>Next</Button>
          )}
        </div>
      </div>

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
