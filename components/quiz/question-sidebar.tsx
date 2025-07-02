"use client"
import { Flag, Check, X } from "lucide-react"
import type { Question, UserAnswer, UserQuestionProgress } from "@/lib/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Circle } from "lucide-react"

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
  return (
    <div className="h-full bg-background">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-foreground">Questions</h3>
      </div>
      <ScrollArea className="h-[calc(100%-4rem)]">
        <div className="space-y-1 p-2">
          {questions.map((q, index) => {
            const progress = userProgress.find((p) => p.question_id === q.id)
            const answer = userAnswers.find((a) => a.question_id === q.id)
            const isCurrent = index === currentIndex

            const getStatusIndicator = () => {
              if (answer) {
                return answer.is_correct ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )
              }
              return <Circle className="h-4 w-4 text-muted-foreground" />
            }

            return (
              <Button
                key={q.id}
                variant="ghost"
                className={`w-full justify-start items-center p-2 h-auto text-left ${
                  isCurrent ? "bg-muted" : "hover:bg-muted"
                }`}
                onClick={() => onQuestionSelect(index)}
              >
                <div className="flex items-center gap-2">
                  {getStatusIndicator()}
                  <span className="flex-1 truncate text-sm font-normal text-foreground">
                    Question {index + 1}
                  </span>
                  {progress?.is_flagged && <Flag className="h-4 w-4 text-yellow-500" />}
                </div>
              </Button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
