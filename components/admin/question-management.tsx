"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, Edit, Trash2, Plus, ArrowLeft, Eye, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import type { Question } from "@/lib/types"
import { getAnswerChoices } from "@/lib/types"
import { QuestionViewer } from "./question-viewer"
import { QuestionEditor } from "./question-editor"

export function QuestionManagement() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [specialtyFilter, setSpecialtyFilter] = useState("all")
  const [difficultyFilter, setDifficultyFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("all")
  const [examTypeFilter, setExamTypeFilter] = useState("all")
  const [loadingFilters, setLoadingFilters] = useState(false)
  
  // Modal states
  const [viewerOpen, setViewerOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)

  // Dynamic data
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([])
  const [availableExamTypes, setAvailableExamTypes] = useState<string[]>([])

  const ITEMS_PER_PAGE = 50

  // Debounced search function
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  const fetchQuestions = useCallback(async (page = 1, resetPage = false) => {
    if (resetPage) {
      page = 1
      setCurrentPage(1)
    }
    
    setLoadingFilters(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        search: searchTerm,
        specialty: specialtyFilter,
        examType: examTypeFilter,
        difficulty: difficultyFilter,
        year: yearFilter,
      })

      const response = await fetch(`/api/admin/questions?${params}`)
      const data = await response.json()

      if (data.questions) {
        setQuestions(data.questions)
        setTotalCount(data.totalCount || 0)
        setTotalPages(data.totalPages || 1)
        setCurrentPage(page)
      } else {
        console.error("Error fetching questions:", data.message)
        setQuestions([])
        setTotalCount(0)
      }
    } catch (error) {
      console.error("Error fetching questions:", error)
      setQuestions([])
      setTotalCount(0)
    } finally {
      setLoading(false)
      setLoadingFilters(false)
    }
  }, [searchTerm, specialtyFilter, difficultyFilter, yearFilter, examTypeFilter])

  const fetchFilterOptions = async () => {
    try {
      // Fetch available years
      const yearsResponse = await fetch("/api/questions/years")
      const yearsData = await yearsResponse.json()
      if (yearsData.years) {
        setAvailableYears(yearsData.years)
      }

      // Fetch available specialties
      const specialtiesResponse = await fetch("/api/specialties")
      const specialtiesData = await specialtiesResponse.json()
      if (specialtiesData.specialties) {
        setAvailableSpecialties(specialtiesData.specialties.map((s: any) => s.name))
      }

      // Fetch available exam types
      const examTypesResponse = await fetch("/api/exam-types")
      const examTypesData = await examTypesResponse.json()
      if (examTypesData.examTypes) {
        setAvailableExamTypes(examTypesData.examTypes.map((e: any) => e.name))
      }
    } catch (error) {
      console.error("Error fetching filter options:", error)
    }
  }

  useEffect(() => {
    fetchFilterOptions()
  }, [])

  useEffect(() => {
    fetchQuestions(1, true)
  }, [specialtyFilter, difficultyFilter, yearFilter, examTypeFilter])

  // Debounced search effect
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    const timeout = setTimeout(() => {
      fetchQuestions(1, true)
    }, 500) // 500ms debounce

    setSearchTimeout(timeout)

    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [searchTerm])

  const deleteQuestion = async (id: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      try {
        const response = await fetch(`/api/admin/questions/${id}`, {
          method: "DELETE",
        })

        if (response.ok) {
          // Refresh the current page
          fetchQuestions(currentPage)
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

  const handleViewQuestion = (id: string) => {
    setSelectedQuestionId(id)
    setViewerOpen(true)
  }

  const handleEditQuestion = (id: string) => {
    setSelectedQuestionId(id)
    setEditorOpen(true)
  }

  const handleCloseViewer = () => {
    setViewerOpen(false)
    setSelectedQuestionId(null)
  }

  const handleCloseEditor = () => {
    setEditorOpen(false)
    setSelectedQuestionId(null)
  }

  const handleSaveQuestion = () => {
    // Refresh the current page and filter options after saving
    fetchQuestions(currentPage)
    fetchFilterOptions()
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchQuestions(newPage)
    }
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setSpecialtyFilter("all")
    setDifficultyFilter("all")
    setYearFilter("all")
    setExamTypeFilter("all")
  }

  const difficultyColors = {
    1: "bg-green-100 text-green-800",
    2: "bg-blue-100 text-blue-800",
    3: "bg-yellow-100 text-yellow-800",
    4: "bg-orange-100 text-orange-800",
    5: "bg-red-100 text-red-800",
  }

  const getDifficultyBadge = (difficulty: number | null | undefined) => {
    if (difficulty === null || difficulty === undefined) {
      return <Badge variant="secondary">N/A</Badge>
    }
    const colors = difficultyColors[difficulty as keyof typeof difficultyColors] || "bg-secondary text-secondary-foreground"
    return <Badge className={`${colors} hover:${colors}`}>{`Level ${difficulty}`}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getChoiceCount = (question: Question) => {
    const choices = getAnswerChoices(question)
    return choices.length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading questions...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Question Management</h1>
              <p className="text-muted-foreground">
                Manage and organize all questions ({totalCount.toLocaleString()} total)
              </p>
            </div>
          </div>
          <Link href="/admin/questions/create">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Question
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
                {loadingFilters && <Loader2 className="w-4 h-4 animate-spin" />}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                Clear All
              </Button>
            </div>
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
                  {availableSpecialties.map((specialty) => (
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
                  {availableExamTypes.map((examType) => (
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
                  {availableYears.map((year) => (
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
            <div className="flex items-center justify-between">
              <CardTitle>
                Questions ({questions.length} of {totalCount.toLocaleString()})
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
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
                  {questions.map((question) => (
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
                          getDifficultyBadge(question.difficulty)
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
                          <Button 
                            variant="outline" 
                            size="sm" 
                            title="View Question"
                            onClick={() => handleViewQuestion(question.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            title="Edit Question"
                            onClick={() => handleEditQuestion(question.id)}
                          >
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
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()} questions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loadingFilters}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {/* Show page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loadingFilters}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loadingFilters}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Question Viewer Modal */}
      <QuestionViewer
        questionId={selectedQuestionId}
        open={viewerOpen}
        onClose={handleCloseViewer}
      />

      {/* Question Editor Modal */}
      <QuestionEditor
        questionId={selectedQuestionId}
        open={editorOpen}
        onClose={handleCloseEditor}
        onSave={handleSaveQuestion}
      />
    </div>
  )
}
