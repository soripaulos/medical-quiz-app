"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ImageUpload } from "./image-upload"
import { Plus, Minus, Save, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface AnswerChoice {
  letter: string
  text: string
}

export default function QuestionCreator() {
  const [questionText, setQuestionText] = useState("")
  const [explanation, setExplanation] = useState("")
  const [sources, setSources] = useState("")
  const [year, setYear] = useState("")
  const [difficulty, setDifficulty] = useState("")
  const [specialty, setSpecialty] = useState("")
  const [examType, setExamType] = useState("")
  const [questionImage, setQuestionImage] = useState<File | null>(null)
  const [explanationImage, setExplanationImage] = useState<File | null>(null)
  const [answerChoices, setAnswerChoices] = useState<AnswerChoice[]>([
    { letter: "A", text: "" },
    { letter: "B", text: "" },
  ])
  const [correctAnswer, setCorrectAnswer] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const specialties = ["Internal Medicine", "Surgery", "Pediatrics", "OB/GYN", "Public Health", "Minor Specialties"]
  const examTypes = ["Exit Exam", "COC"]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 20 }, (_, i) => currentYear - i)

  const addAnswerChoice = () => {
    const nextLetter = String.fromCharCode(65 + answerChoices.length) // A, B, C, D, etc.
    if (answerChoices.length < 6) {
      setAnswerChoices([...answerChoices, { letter: nextLetter, text: "" }])
    }
  }

  const removeAnswerChoice = (letter: string) => {
    if (answerChoices.length > 2) {
      setAnswerChoices(answerChoices.filter((choice) => choice.letter !== letter))
      // Reset correct answer if we're removing the correct choice
      if (correctAnswer === letter) {
        setCorrectAnswer("")
      }
    }
  }

  const updateAnswerChoice = (letter: string, text: string) => {
    setAnswerChoices(answerChoices.map((choice) => (choice.letter === letter ? { ...choice, text } : choice)))
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

    setIsSubmitting(true)

    try {
      const questionImageUrl = questionImage ? await uploadImage(questionImage) : null
      const explanationImageUrl = explanationImage ? await uploadImage(explanationImage) : null

      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText,
          explanation,
          sources,
          year,
          difficulty,
          specialty,
          examType,
          questionImageUrl,
          explanationImageUrl,
          answerChoices,
          correctAnswer,
        }),
      })

      if (!res.ok) {
        const msg = await res.json()
        throw new Error(msg.message ?? "Unknown error")
      }

      alert("Question created successfully!")
      router.push("/admin/questions")
    } catch (err) {
      console.error(err)
      alert("Error creating question: " + String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Question</h1>
            <p className="text-gray-600">Add a new question to the database</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Details */}
          <Card>
            <CardHeader>
              <CardTitle>Question Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
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
                      {[1, 2, 3, 4, 5].map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                          {d} {d === 1 ? "(Easy)" : d === 5 ? "(Very Hard)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="specialty">Specialty</Label>
                  <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialties.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
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
                      {examTypes.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Question Content */}
          <Card>
            <CardHeader>
              <CardTitle>Question Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="questionText">Question Text *</Label>
                <Textarea
                  id="questionText"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter the question text..."
                  className="min-h-[120px]"
                  required
                />
              </div>

              <div>
                <Label>Question Image (Optional)</Label>
                <ImageUpload onImageSelect={setQuestionImage} />
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
              <RadioGroup value={correctAnswer} onValueChange={setCorrectAnswer}>
                {answerChoices.map((choice) => (
                  <div key={choice.letter} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-2 pt-2">
                      <RadioGroupItem value={choice.letter} id={`correct-${choice.letter}`} />
                      <Label htmlFor={`correct-${choice.letter}`} className="text-sm">
                        <Badge variant="outline">{choice.letter}</Badge>
                      </Label>
                    </div>

                    <div className="flex-1">
                      <Label htmlFor={`choice-${choice.letter}`} className="text-sm font-medium">
                        Choice {choice.letter}
                      </Label>
                      <Input
                        id={`choice-${choice.letter}`}
                        value={choice.text}
                        onChange={(e) => updateAnswerChoice(choice.letter, e.target.value)}
                        placeholder={`Enter choice ${choice.letter}...`}
                        className="mt-1"
                        required
                      />
                    </div>

                    {answerChoices.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAnswerChoice(choice.letter)}
                        className="mt-6"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </RadioGroup>

              {!correctAnswer && (
                <p className="text-sm text-red-600">
                  Please select the correct answer by clicking the radio button next to it.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Explanation */}
          <Card>
            <CardHeader>
              <CardTitle>Explanation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="explanation">Explanation Text *</Label>
                <Textarea
                  id="explanation"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Enter the detailed explanation..."
                  className="min-h-[120px]"
                  required
                />
              </div>

              <div>
                <Label>Explanation Image (Optional)</Label>
                <ImageUpload onImageSelect={setExplanationImage} />
              </div>

              <div>
                <Label htmlFor="sources">Sources (Optional)</Label>
                <Textarea
                  id="sources"
                  value={sources}
                  onChange={(e) => setSources(e.target.value)}
                  placeholder="Enter sources and references..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? (
                "Creating..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Question
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
