"use client"
import { Flag, Check, X } from "lucide-react"
import type { Question, UserAnswer, UserQuestionProgress } from "@/lib/types"

interface QuestionSidebarProps {
  questions: Question[]
  currentIndex: number
  userAnswers: UserAnswer[]
  userProgress: UserQuestionProgress[]
  onQuestionSelect: (index: number) => void
}

export function QuestionSidebar({
  questions,
  currentIndex,
  userAnswers,
  userProgress,
  onQuestionSelect,
}: QuestionSidebarProps) {
  const getQuestionStatus = (questionId: string) => {
    const answer = userAnswers.find((a) => a.question_id === questionId)
    if (!answer) return "unanswered"
    return answer.is_correct ? "correct" : "incorrect"
  }

  const getQuestionIcon = (questionId: string, index: number) => {
    const status = getQuestionStatus(questionId)

    if (index === currentIndex) {
      return (
        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
          {index + 1}
        </div>
      )
    }

    switch (status) {
      case "correct":
        return (
          <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center">
            <Check className="w-3 h-3" />
          </div>
        )
      case "incorrect":
        return (
          <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center">
            <X className="w-3 h-3" />
          </div>
        )
      default:
        return (
          <div className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center text-xs font-medium text-gray-600">
            {index + 1}
          </div>
        )
    }
  }

  return (
    <div className="h-full bg-white dark:bg-gray-800">
      <div className="p-4 border-b dark:border-gray-700">
        <h3 className="font-semibold text-lg dark:text-white">Questions</h3>
      </div>

      <div className="p-3 space-y-1 overflow-auto">
        {questions.map((question, index) => {
          const progress = userProgress.find((p) => p.question_id === question.id)
          const isActive = index === currentIndex

          return (
            <div
              key={question.id}
              className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${
                isActive
                  ? "bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-600"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              onClick={() => onQuestionSelect(index)}
            >
              {getQuestionIcon(question.id, index)}

              <span className="text-sm font-medium dark:text-white">{index + 1}.</span>

              <div className="flex-1" />

              {progress?.is_flagged && <Flag className="w-4 h-4 text-red-500 fill-current" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
