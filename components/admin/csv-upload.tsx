"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Download, ArrowLeft, FileText, AlertCircle } from "lucide-react"
import Link from "next/link"

export function CSVUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile)
      setResults(null)
    } else {
      alert("Please select a valid CSV file")
    }
  }

  const parseCSV = (csvText: string) => {
    const lines = csvText.split("\n")
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
    const questions = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Handle CSV parsing with quoted values
      const values: string[] = []
      let current = ""
      let inQuotes = false

      for (let j = 0; j < line.length; j++) {
        const char = line[j]

        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          values.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
      values.push(current.trim()) // Add the last value

      const question: any = {}
      headers.forEach((header, index) => {
        // Remove quotes from values and clean them
        const value = (values[index] || "").replace(/^"|"$/g, "").trim()
        question[header] = value
      })

      questions.push(question)
    }

    return questions
  }

  const uploadQuestions = async () => {
    if (!file) return

    setUploading(true)
    const errors: string[] = []
    let successCount = 0

    try {
      const csvText = await file.text()
      const questions = parseCSV(csvText)

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]

        try {
          // Validate required fields
          if (!q.question_text || !q.explanation) {
            errors.push(`Row ${i + 2}: Missing required fields (question_text, explanation)`)
            continue
          }

          // Clean and validate specialty and exam_type
          const specialty = q.specialty ? q.specialty.trim() : ""
          const examType = q.exam_type ? q.exam_type.trim() : ""

          // Parse answer choices from CSV
          const answerChoices = []
          let choiceIndex = 0
          const letters = ["A", "B", "C", "D", "E", "F", "G", "H"]

          while (q[`choice_${letters[choiceIndex]}`]) {
            const choiceText = q[`choice_${letters[choiceIndex]}`].trim()
            if (choiceText) {
              const isCorrect = q.correct_answer?.trim().toUpperCase() === letters[choiceIndex]

              answerChoices.push({
                letter: letters[choiceIndex],
                text: choiceText,
                isCorrect: isCorrect,
              })
            }
            choiceIndex++
          }

          if (answerChoices.length === 0) {
            errors.push(`Row ${i + 2}: No answer choices found`)
            continue
          }

          if (!q.correct_answer?.trim()) {
            errors.push(`Row ${i + 2}: Missing correct answer`)
            continue
          }

          // Send to API
          const response = await fetch("/api/admin/questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionText: q.question_text.trim(),
              explanation: q.explanation.trim(),
              sources: q.sources ? q.sources.trim() : "",
              year: q.year ? q.year.trim() : "",
              difficulty: q.difficulty ? q.difficulty.trim() : "",
              specialty: specialty,
              examType: examType,
              questionImageUrl: null,
              explanationImageUrl: null,
              answerChoices,
              correctAnswer: q.correct_answer.trim().toUpperCase(),
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || "Failed to create question")
          }

          successCount++
        } catch (error) {
          errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
      }

      setResults({ success: successCount, errors })
    } catch (error) {
      errors.push(`File parsing error: ${error instanceof Error ? error.message : "Unknown error"}`)
      setResults({ success: successCount, errors })
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    const template = `question_text,explanation,sources,year,difficulty,specialty,exam_type,choice_A,choice_B,choice_C,choice_D,correct_answer
"A 45-year-old patient presents with chest pain...","This is a case of myocardial infarction...","Harrison's Internal Medicine",2023,3,"Internal Medicine","Exit Exam","Myocardial infarction","Angina pectoris","Pulmonary embolism","Aortic dissection","A"
"A 30-year-old woman in labor...","Normal delivery process...","Williams Obstetrics",2023,2,"OB/GYN","Exit Exam","Continue monitoring","Immediate C-section","Episiotomy","Forceps delivery","A"`

    const blob = new Blob([template], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "questions_template.csv"
    a.click()
    URL.revokeObjectURL(url)
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
            <h1 className="text-3xl font-bold text-gray-900">Bulk Upload Questions</h1>
            <p className="text-gray-600">Upload multiple questions using a CSV file</p>
          </div>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              CSV Format Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">Your CSV file should include the following columns:</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Required columns:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>question_text</li>
                  <li>explanation</li>
                  <li>choice_A, choice_B, choice_C, etc.</li>
                  <li>correct_answer (A, B, C, etc.)</li>
                </ul>
              </div>
              <div>
                <strong>Optional columns:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>sources</li>
                  <li>year</li>
                  <li>difficulty (1-5)</li>
                  <li>specialty</li>
                  <li>exam_type</li>
                </ul>
              </div>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!file ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium mb-2">Choose a CSV file to upload</p>
                <p className="text-sm text-gray-600 mb-4">File should be in CSV format with proper headers</p>
                <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" id="csv-upload" />
                <label htmlFor="csv-upload">
                  <Button asChild>
                    <span>Select CSV File</span>
                  </Button>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-600">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <Button
                    onClick={() => {
                      setFile(null)
                      setResults(null)
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Remove
                  </Button>
                </div>

                <Button onClick={uploadQuestions} disabled={uploading} className="w-full">
                  {uploading ? "Uploading..." : "Upload Questions"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {results.errors.length > 0 ? (
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                ) : (
                  <FileText className="w-5 h-5 text-green-500" />
                )}
                Upload Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-800">{results.success}</p>
                  <p className="text-sm text-green-600">Questions uploaded successfully</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-lg font-bold text-red-800">{results.errors.length}</p>
                  <p className="text-sm text-red-600">Errors encountered</p>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Errors:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {results.errors.map((error, index) => (
                      <p key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
