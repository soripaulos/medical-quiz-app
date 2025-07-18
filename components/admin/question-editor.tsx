"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ImageUpload } from "./image-upload"
import { X, Plus, Minus, Save } from "lucide-react"
import type { Question } from "@/lib/types"
import { getAnswerChoices } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

interface AnswerChoice {
  letter: string
  text: string
}

interface QuestionEditorProps {
  questionId: string | null
  open: boolean
  onClose: () => void
  onSave: () => void
}

export function QuestionEditor({ questionId, open, onClose, onSave }: QuestionEditorProps) {
  const [question, setQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [questionText, setQuestionText] = useState("")
  const [explanation, setExplanation] = useState("")
  const [sources, setSources] = useState("")
  const [year, setYear] = useState("")
  const [difficulty, setDifficulty] = useState("")
  const [specialty, setSpecialty] = useState("")
  const [examType, setExamType] = useState("")
  const [questionImage, setQuestionImage] = useState<File | null>(null)
  const [explanationImage, setExplanationImage] = useState<File | null>(null)
  const [answerChoices, setAnswerChoices] = useState<AnswerChoice[]>([])
  const [correctAnswer, setCorrectAnswer] = useState("")

  const specialties = ["Internal Medicine", "Surgery", "Pediatrics", "OB/GYN", "Public Health", "Minor Specialties"]
  const examTypes = ["Exit Exam", "COC"]
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 20 }, (_, i) => currentYear - i)

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
        const q = data.question
        setQuestion(q)
        
        // Populate form fields
        setQuestionText(q.question_text || "")
        setExplanation(q.explanation || "")
        setSources(q.sources || "")
        setYear(q.year?.toString() || "")
        setDifficulty(q.difficulty?.toString() || "")
        setSpecialty(q.specialty?.name || "")
        setExamType(q.exam_type?.name || "")
        setCorrectAnswer(q.correct_answer || "")
        
        // Convert question choices to form format
        const choices = getAnswerChoices(q)
        setAnswerChoices(choices.map(choice => ({
          letter: choice.letter,
          text: choice.text
        })))
      }
    } catch (error) {
      console.error("Error fetching question:", error)
    } finally {
      setLoading(false)
    }
  }

  const addAnswerChoice = () => {
    const nextLetter = String.fromCharCode(65 + answerChoices.length)
    if (answerChoices.length < 6) {
      setAnswerChoices([...answerChoices, { letter: nextLetter, text: "" }])
    }
  }

  const removeAnswerChoice = (letter: string) => {
    if (answerChoices.length > 2) {
      setAnswerChoices(answerChoices.filter((choice) => choice.letter !== letter))
      if (correctAnswer === letter) {
        setCorrectAnswer("")
      }
    }
  }

  const updateAnswerChoice = (letter: string, text: string) => {
    setAnswerChoices(answerChoices.map((choice) => 
      choice.letter === letter ? { ...choice, text } : choice
    ))
  }

  const uploadImage = async (file: File): Promise<string> => {
    const supabase = createClient()
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `question-images/${fileName}`

    const { error: uploadError } = await supabase.storage.from("images").upload(filePath, file)

    if (uploadError) {
      throw uploadError
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("images").getPublicUrl(filePath)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!correctAnswer) {
      alert("Please select the correct answer")
      return
    }

    if (!questionId) return

    setSaving(true)

    try {
      const questionImageUrl = questionImage ? await uploadImage(questionImage) : question?.question_image_url
      const explanationImageUrl = explanationImage ? await uploadImage(explanationImage) : question?.explanation_image_url

      const payload = {
        questionText,
        explanation,
        sources,
        year: year || null,
        difficulty: difficulty || null,
        specialty: specialty || null,
        examType: examType || null,
        questionImageUrl,
        explanationImageUrl,
        answerChoices,
        correctAnswer,
      }

      const response = await fetch(`/api/admin/questions/${questionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.ok) {
        alert("Question updated successfully!")
        onSave()
        onClose()
      } else {
        throw new Error(data.message || "Failed to update question")
      }
    } catch (error) {
      console.error("Error updating question:", error)
      alert("Error updating question. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    // Reset form state
    setQuestionText("")
    setExplanation("")
    setSources("")
    setYear("")
    setDifficulty("")
    setSpecialty("")
    setExamType("")
    setQuestionImage(null)
    setExplanationImage(null)
    setAnswerChoices([])
    setCorrectAnswer("")
    setQuestion(null)
    onClose()
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit Question</span>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Question Text */}
            <Card>
              <CardHeader>
                <CardTitle>Question Text</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="question">Question *</Label>
                  <Textarea
                    id="question"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Enter the question text..."
                    className="min-h-[100px]"
                    required
                  />
                </div>
                <div>
                  <Label>Question Image</Label>
                  <ImageUpload
                    onImageSelect={setQuestionImage}
                    currentImageUrl={question?.question_image_url}
                    placeholder="Upload question image (optional)"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Answer Choices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Answer Choices
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAnswerChoice}
                    disabled={answerChoices.length >= 6}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Choice
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {answerChoices.map((choice) => (
                  <div key={choice.letter} className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label htmlFor={`choice-${choice.letter}`}>Choice {choice.letter}</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`choice-${choice.letter}`}
                          value={choice.text}
                          onChange={(e) => updateAnswerChoice(choice.letter, e.target.value)}
                          placeholder={`Enter choice ${choice.letter}...`}
                          required
                        />
                        {answerChoices.length > 2 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeAnswerChoice(choice.letter)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="mt-4">
                  <Label>Correct Answer *</Label>
                  <RadioGroup value={correctAnswer} onValueChange={setCorrectAnswer} className="mt-2">
                    <div className="flex flex-wrap gap-4">
                      {answerChoices.map((choice) => (
                        <div key={choice.letter} className="flex items-center space-x-2">
                          <RadioGroupItem value={choice.letter} id={`correct-${choice.letter}`} />
                          <Label htmlFor={`correct-${choice.letter}`}>Choice {choice.letter}</Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Explanation */}
            <Card>
              <CardHeader>
                <CardTitle>Explanation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="explanation">Explanation *</Label>
                  <Textarea
                    id="explanation"
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Provide a detailed explanation..."
                    className="min-h-[100px]"
                    required
                  />
                </div>
                <div>
                  <Label>Explanation Image</Label>
                  <ImageUpload
                    onImageSelect={setExplanationImage}
                    currentImageUrl={question?.explanation_image_url}
                    placeholder="Upload explanation image (optional)"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Question Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="specialty">Specialty</Label>
                    <Select value={specialty} onValueChange={setSpecialty}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select specialty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {specialties.map((spec) => (
                          <SelectItem key={spec} value={spec}>
                            {spec}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="examType">Exam Type</Label>
                    <Select value={examType} onValueChange={setExamType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select exam type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {examTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="year">Year</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {years.map((yr) => (
                          <SelectItem key={yr} value={yr.toString()}>
                            {yr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {[1, 2, 3, 4, 5].map((diff) => (
                          <SelectItem key={diff} value={diff.toString()}>
                            Level {diff}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="sources">Sources</Label>
                  <Textarea
                    id="sources"
                    value={sources}
                    onChange={(e) => setSources(e.target.value)}
                    placeholder="List sources or references (optional)"
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}