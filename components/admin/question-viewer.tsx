"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Image as ImageIcon, FileText, Calendar, Target, GraduationCap, Stethoscope } from "lucide-react"
import type { Question } from "@/lib/types"
import { getAnswerChoices } from "@/lib/types"

interface QuestionViewerProps {
  questionId: string | null
  open: boolean
  onClose: () => void
}

export function QuestionViewer({ questionId, open, onClose }: QuestionViewerProps) {
  const [question, setQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (questionId && open) {
      fetchQuestion()
    }
  }, [questionId, open])

  const fetchQuestion = async () => {
    if (!questionId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/questions/${questionId}`)
      const data = await response.json()

      if (data.question) {
        setQuestion(data.question)
      }
    } catch (error) {
      console.error("Error fetching question:", error)
    } finally {
      setLoading(false)
    }
  }

  const getDifficultyBadge = (difficulty: number | null | undefined) => {
    if (difficulty === null || difficulty === undefined) {
      return <Badge variant="secondary">N/A</Badge>
    }
    
    const colors = {
      1: "bg-green-100 text-green-800",
      2: "bg-blue-100 text-blue-800", 
      3: "bg-yellow-100 text-yellow-800",
      4: "bg-orange-100 text-orange-800",
      5: "bg-red-100 text-red-800",
    }
    
    const color = colors[difficulty as keyof typeof colors] || "bg-secondary text-secondary-foreground"
    return <Badge className={`${color} hover:${color}`}>{`Level ${difficulty}`}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading question...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!question) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center h-64">
            <p>Question not found</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const answerChoices = getAnswerChoices(question)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Question Details</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            View complete question details including metadata, answer choices, and explanations.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh] pr-4">
          <div className="space-y-6">
            {/* Question Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Specialty</p>
                  <Badge variant="outline">{question.specialty?.name || "N/A"}</Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Exam Type</p>
                  <Badge variant="outline">{question.exam_type?.name || "N/A"}</Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Difficulty</p>
                  {getDifficultyBadge(question.difficulty)}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Year</p>
                  <Badge variant="secondary">{question.year || "N/A"}</Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Question Text */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Question
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{question.question_text}</p>
                {question.question_image_url && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Question Image</span>
                    </div>
                    <img 
                      src={question.question_image_url} 
                      alt="Question" 
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Answer Choices */}
            <Card>
              <CardHeader>
                <CardTitle>Answer Choices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {answerChoices.map((choice) => (
                    <div 
                      key={choice.letter} 
                      className={`p-3 rounded-lg border ${
                        choice.is_correct 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Badge 
                          variant={choice.is_correct ? "default" : "secondary"}
                          className={choice.is_correct ? "bg-green-600" : ""}
                        >
                          {choice.letter}
                        </Badge>
                        <p className="text-sm leading-relaxed flex-1">{choice.text}</p>
                        {choice.is_correct && (
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            Correct
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Explanation */}
            <Card>
              <CardHeader>
                <CardTitle>Explanation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{question.explanation}</p>
                {question.explanation_image_url && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Explanation Image</span>
                    </div>
                    <img 
                      src={question.explanation_image_url} 
                      alt="Explanation" 
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sources */}
            {question.sources && (
              <Card>
                <CardHeader>
                  <CardTitle>Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{question.sources}</p>
                </CardContent>
              </Card>
            )}

            {/* Creation Info */}
            <Card>
              <CardHeader>
                <CardTitle>Creation Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p>{formatDate(question.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Updated</p>
                    <p>{formatDate(question.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}