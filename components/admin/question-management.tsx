"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, Edit, Trash2, Plus, ArrowLeft, Eye } from "lucide-react"
import Link from "next/link"
import type { Question } from "@/lib/types"
import { getAnswerChoices } from "@/lib/types"

export default function QuestionManagement() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [specialtyFilter, setSpecialtyFilter] = useState("all")
  const [difficultyFilter, setDifficultyFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("all")
  const [examTypeFilter, setExamTypeFilter] = useState("all")

  const specialties = ["Internal Medicine", "Surgery", "Pediatrics", "OB/GYN", "Public Health", "Minor Specialties"]
  const examTypes = ["Exit Exam", "COC"]

  useEffect(() => {
    fetchQuestions()
  }, [])

  useEffect(() => {
    filterQuestions()
  }, [questions, searchTerm, specialtyFilter, difficultyFilter, yearFilter, examTypeFilter])

  const fetchQuestions = async () => {
    try {
      const response = await fetch("/api/admin/questions")
      const data = await response.json()

      if (data.questions) {
        setQuestions(data.questions)
      }
    } catch (error) {
      console.error("Error fetching questions:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterQuestions = () => {
    let filtered = questions

    if (searchTerm) {
      filtered = filtered.filter((q) => q.question_text.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    if (specialtyFilter !== "all") {
      filtered = filtered.filter((q) => q.specialty?.name === specialtyFilter)
    }

    if (examTypeFilter !== "all") {
      filtered = filtered.filter((q) => q.exam_type?.name === examTypeFilter)
    }

    if (difficultyFilter !== "all") {
      filtered = filtered.filter((q) => q.difficulty === Number.parseInt(difficultyFilter))
    }

    if (yearFilter !== "all") {
      filtered = filtered.filter((q) => q.year === Number.parseInt(yearFilter))
    }

    setFilteredQuestions(filtered)
  }

  const deleteQuestion = async (id: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      try {
        const response = await fetch(`/api/admin/questions/${id}`, {
          method: "DELETE",
        })

        if (response.ok) {
          setQuestions(questions.filter((q) => q.id !== id))
          alert("Question deleted successfully!")
        } else {
          throw new Error("Failed to delete question")
        }
      } catch (error) {
        console.error("Error deleting question:", error)
        alert("Error deleting question. Please try again.")
      }
    }
  }

  const getDifficultyBadge = (difficulty: number) => {
    const colors = {
      1: "bg-green-100 text-green-800",
      2: "bg-blue-100 text-blue-800",
      3: "bg-yellow-100 text-yellow-800",
      4: "bg-orange-100 text-orange-800",
      5: "bg-red-100 text-red-800",
    }
    return colors[difficulty as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getChoiceCount = (question: Question) => {
    const choices = getAnswerChoices(question)
    return choices.length
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading questions...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Question Management</h1>
              <p className="text-gray-600">Manage and organize all questions</p>
            </div>
          </div>
          <Link href="/admin/questions/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Question
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Specialties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={examTypeFilter} onValueChange={setExamTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Exam Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exam Types</SelectItem>
                  {examTypes.map((examType) => (
                    <SelectItem key={examType} value={examType}>
                      {examType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  {[1, 2, 3, 4, 5].map((diff) => (
                    <SelectItem key={diff} value={diff.toString()}>
                      Difficulty {diff}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Questions Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Questions ({filteredQuestions.length} of {questions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Exam Type</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Choices</TableHead>
                  <TableHead>Correct</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell className="max-w-md">
                      <p className="truncate font-medium">{question.question_text}</p>
                      {question.question_image_url && (
                        <Badge variant="outline" className="mt-1">
                          Has Image
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{question.specialty?.name || "N/A"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{question.exam_type?.name || "N/A"}</Badge>
                    </TableCell>
                    <TableCell>
                      {question.difficulty && (
                        <Badge className={getDifficultyBadge(question.difficulty)}>{question.difficulty}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{question.year || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getChoiceCount(question)} choices</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {question.correct_answer || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{formatDate(question.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" title="View Question">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" title="Edit Question">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteQuestion(question.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredQuestions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {questions.length === 0 ? "No questions created yet." : "No questions found matching your criteria."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
