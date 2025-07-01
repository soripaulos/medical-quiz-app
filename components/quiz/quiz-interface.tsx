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
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showSubmitPrompt, setShowSubmitPrompt] = useState(false)
  const [localProgress, setLocalProgress] = useState<UserQuestionProgress[]>(userProgress)
  const [userNotes, setUserNotes] = useState<UserNote[]>([])

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

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")
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
      if (isDarkMode) {
        return isSelected
          ? "border-blue-500 bg-blue-500/20" // Selected answer in dark mode
          : "border-gray-700 hover:border-gray-500"
      }
      return isSelected
        ? "border-blue-500 bg-blue-50" // Selected answer in light mode
        : "border-gray-200 hover:border-gray-300"
    }

    // After explanation is shown
    if (isDarkMode) {
      if (choice.is_correct) {
        return "border-green-500 bg-green-500/20" // Correct answer in dark mode
      }
      if (isSelected && !choice.is_correct) {
        return "border-red-500 bg-red-500/20" // Incorrect answer in dark mode
      }
      return "border-gray-700" // Default for other choices in dark mode
    }

    // Light mode (existing logic)
    if (choice.is_correct) {
      return "border-green-500 bg-green-50"
    }
    if (isSelected && !choice.is_correct) {
      return "border-red-500 bg-red-50"
    }
    return "border-gray-200 bg-gray-50"
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
    <div className={`flex h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div
          className={`${isDarkMode ? "bg-gray-800" : "bg-blue-600"} text-white p-4 flex items-center justify-between`}
        >
          <div className="flex items-center gap-4">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-32 p-0">
                <QuestionSidebar
                  questions={questions}
                  currentIndex={currentQuestionIndex}
                  userAnswers={userAnswers}
                  userProgress={localProgress}
                  onQuestionSelect={handleQuestionSelect}
                />
              </SheetContent>
            </Sheet>
            <span className="font-medium">
              Item {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-blue-200">Question Id: {currentQuestion.id.slice(0, 8)}</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-700 flex flex-col items-center px-2 py-1 h-auto"
              onClick={handleFlagQuestion}
            >
              <Flag className={`w-3 h-3 ${currentProgress?.is_flagged ? "fill-red-500 text-red-500" : "text-white"}`} />
              <span className="text-xs mt-1">{currentProgress?.is_flagged ? "Unflag" : "Flag"}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-700 flex flex-col items-center px-2 py-1 h-auto"
              onClick={() => setShowLabValues(true)}
            >
              <Beaker className="w-3 h-3" />
              <span className="text-xs mt-1">Lab values</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-700 flex flex-col items-center px-2 py-1 h-auto relative"
              onClick={() => setShowNotes(!showNotes)}
            >
              <StickyNote className="w-3 h-3" />
              <span className="text-xs mt-1">Notes</span>
              {currentNote?.note_text && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-blue-600" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-700 flex flex-col items-center px-2 py-1 h-auto"
              onClick={toggleDarkMode}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3 h-3" />
                  <span className="text-xs mt-1">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3 h-3" />
                  <span className="text-xs mt-1">Night</span>
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-700 flex flex-col items-center px-2 py-1 h-auto"
              onClick={() => setShowCalculator(true)}
            >
              <Calculator className="w-3 h-3" />
              <span className="text-xs mt-1">calculator</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Question */}
              <Card className={isDarkMode ? "bg-gray-800 border-gray-700" : ""}>
                <CardContent className="p-6">
                  <div className="prose max-w-none">
                    <p className={`text-lg leading-relaxed mb-4 ${isDarkMode ? "text-gray-100" : ""}`}>
                      {currentQuestion.question_text}
                    </p>
                    {currentQuestion.question_image_url && (
                      <img
                        src={currentQuestion.question_image_url || "/placeholder.svg"}
                        alt="Question image"
                        className="max-w-full h-auto rounded-lg"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Answer Choices */}
              <div className="space-y-3">
                {answerChoices.map((choice) => {
                  const isSelected = currentSelectedAnswer === choice.letter
                  return (
                    <Card
                      key={choice.letter}
                      className={`cursor-pointer transition-all ${getChoiceStyle(choice, isSelected)}`}
                      onClick={() => !showCurrentExplanation && handleAnswerSelect(choice.letter)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-sm font-medium">
                            {choice.letter}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm ${isDarkMode ? "text-gray-100" : ""}`}>{choice.text}</p>
                          </div>
                          {showCurrentExplanation && choice.is_correct && (
                            <Badge
                              variant="secondary"
                              className={
                                isDarkMode
                                  ? "bg-green-500/20 text-green-300 border-green-500/30"
                                  : "bg-green-100 text-green-800"
                              }
                            >
                              Correct
                            </Badge>
                          )}
                          {showCurrentExplanation && isSelected && !choice.is_correct && (
                            <Badge
                              variant="secondary"
                              className={
                                isDarkMode ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-red-100 text-red-800"
                              }
                            >
                              Incorrect
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Explanation */}
              {showCurrentExplanation && (
                <Card className={isDarkMode ? "bg-gray-800 border-gray-700" : ""}>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 text-blue-600">Explanation</h3>
                    <div className="prose max-w-none">
                      <p className={`mb-4 ${isDarkMode ? "text-gray-100" : ""}`}>{currentQuestion.explanation}</p>
                      {currentQuestion.explanation_image_url && (
                        <img
                          src={currentQuestion.explanation_image_url || "/placeholder.svg"}
                          alt="Explanation image"
                          className="max-w-full h-auto rounded-lg mb-4"
                        />
                      )}
                      {currentQuestion.sources && (
                        <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                          <h4 className={`font-medium mb-2 ${isDarkMode ? "text-gray-100" : ""}`}>Sources:</h4>
                          <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                            {currentQuestion.sources}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Notes Panel */}
          {showNotes && (
            <div className={`w-80 border-l p-4 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white"}`}>
              <NotesPanel
                questionId={currentQuestion.id}
                noteText={noteText}
                onNoteChange={setNoteText}
                onSaveNote={handleSaveNote}
                isDarkMode={isDarkMode}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`${isDarkMode ? "bg-gray-800" : "bg-blue-600"} text-white p-4 flex items-center justify-between`}
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-700"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-700"
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            {session.time_limit && <span className="text-sm">block time remaining: {formatTime(timeRemaining)}</span>}
            <Button variant="destructive" size="sm" onClick={() => setShowSubmitPrompt(true)}>
              <Square className="w-4 h-4 mr-1" />
              End Block
            </Button>
          </div>
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
    </div>
  )
}

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}
