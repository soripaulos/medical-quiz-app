"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageSquare, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import type { Question, FeedbackType, AnswerChoice } from "@/lib/types"
import { getAnswerChoices } from "@/lib/types"

interface QuestionFeedbackProps {
  question: Question
  sessionId?: string
}

const FEEDBACK_TYPES = [
  {
    value: 'ANSWER_CORRECTION' as FeedbackType,
    label: 'Answer Correction',
    description: 'The correct answer is wrong or there\'s a better answer',
  },
  {
    value: 'FAULTY_QUESTION' as FeedbackType,
    label: 'Faulty Question',
    description: 'The question is unclear, ambiguous, or poorly written',
  },
  {
    value: 'INCORRECT_EXPLANATION' as FeedbackType,
    label: 'Incorrect Explanation',
    description: 'The explanation contains errors or is misleading',
  },
  {
    value: 'INCOMPLETE_INFO' as FeedbackType,
    label: 'Incomplete Information',
    description: 'Missing important details or context',
  },
  {
    value: 'TYPO_ERROR' as FeedbackType,
    label: 'Typo/Grammar Error',
    description: 'Spelling mistakes, grammar errors, or formatting issues',
  },
  {
    value: 'IMAGE_ISSUE' as FeedbackType,
    label: 'Image Issue',
    description: 'Image is unclear, missing, or doesn\'t load properly',
  },
  {
    value: 'SOURCE_ISSUE' as FeedbackType,
    label: 'Source Problem',
    description: 'Issues with source citation or reference accuracy',
  },
]

export function QuestionFeedback({ question, sessionId }: QuestionFeedbackProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null)
  const [suggestedAnswer, setSuggestedAnswer] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState("")

  const { user } = useAuth()
  const supabase = createClient()

  const answerChoices = getAnswerChoices(question)
  const requiresAnswerSelection = selectedType === 'ANSWER_CORRECTION'
  const canSubmit = selectedType && (!requiresAnswerSelection || suggestedAnswer)

  const handleSubmit = async () => {
    if (!canSubmit || !user) return

    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage("")

    try {
      const feedbackData = {
        user_id: user.id,
        question_id: question.id,
        session_id: sessionId || null,
        feedback_type: selectedType,
        suggested_correct_answer: requiresAnswerSelection ? suggestedAnswer : null,
      }

      console.log('Submitting feedback data:', feedbackData)

      const { error } = await supabase
        .from('question_feedbacks')
        .insert([feedbackData])

      if (error) {
        console.error('Error submitting feedback:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        setSubmitStatus('error')
        setErrorMessage(`${error.message}${error.hint ? ` (${error.hint})` : ''}`)
      } else {
        setSubmitStatus('success')
        // Reset form after successful submission
        setTimeout(() => {
          setIsOpen(false)
          resetForm()
        }, 1500)
      }
    } catch (error) {
      console.error('Unexpected error submitting feedback:', error)
      setSubmitStatus('error')
      setErrorMessage('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedType(null)
    setSuggestedAnswer("")
    setSubmitStatus('idle')
    setErrorMessage("")
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const selectedFeedbackType = FEEDBACK_TYPES.find(type => type.value === selectedType)

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <MessageSquare className="h-5 w-5" />
          <span className="sr-only">Question Feedback</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Question Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve this question by providing feedback about any issues you've noticed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Feedback Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">What type of issue did you find?</label>
            <Select
              value={selectedType || ""}
              onValueChange={(value) => {
                setSelectedType(value as FeedbackType)
                setSuggestedAnswer("") // Reset answer selection when type changes
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select feedback type..." />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Form Based on Feedback Type */}
          {selectedType && (
            <div className="space-y-4">
              {/* Show selected feedback type */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">
                    {selectedFeedbackType?.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedFeedbackType?.description}
                </p>
              </div>

              {/* Answer Correction Form */}
              {requiresAnswerSelection && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    What do you think the correct answer should be?
                  </label>
                  <div className="space-y-2">
                    {answerChoices.map((choice) => (
                      <label
                        key={choice.letter}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                          suggestedAnswer === choice.letter
                            ? 'border-primary bg-primary/5'
                            : 'border-border'
                        }`}
                      >
                        <input
                          type="radio"
                          name="suggestedAnswer"
                          value={choice.letter}
                          checked={suggestedAnswer === choice.letter}
                          onChange={(e) => setSuggestedAnswer(e.target.value)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs font-mono">
                              {choice.letter}
                            </Badge>
                            {choice.is_correct && (
                              <Badge variant="secondary" className="text-xs">
                                Current Answer
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{choice.text}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Feedback Types */}
              {!requiresAnswerSelection && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Thank you for identifying this issue. Your feedback will help us improve the question quality.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Submit Status */}
          {submitStatus === 'success' && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Thank you! Your feedback has been submitted successfully.
              </AlertDescription>
            </Alert>
          )}

          {submitStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage || 'Failed to submit feedback. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}