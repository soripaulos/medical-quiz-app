"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Play, Filter, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import type { Question, QuestionFilters } from "@/lib/types"

export function CreateTestInterface() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [filters, setFilters] = useState<QuestionFilters>({
    specialties: [],
    years: [],
    difficulties: [],
    examTypes: [],
    questionStatus: [],
  })

  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([])
  const [questionCount, setQuestionCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sessionName, setSessionName] = useState("")
  const [sessionMode, setSessionMode] = useState<"practice" | "exam">("practice")
  const [timeLimit, setTimeLimit] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  // Fetch available options from database
  const [specialties, setSpecialties] = useState<string[]>([])
  const [examTypes, setExamTypes] = useState<string[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])

  const difficulties = [1, 2, 3, 4, 5]
  const questionStatuses = [
    { value: "answered", label: "Answered" },
    { value: "unanswered", label: "Unanswered" },
    { value: "correct", label: "Correct" },
    { value: "incorrect", label: "Incorrect" },
    { value: "flagged", label: "Flagged" },
  ]

  useEffect(() => {
    fetchFilterOptions()
    generateSessionName()
  }, [])

  useEffect(() => {
    fetchFilteredQuestions()
  }, [filters])

  useEffect(() => {
    generateSessionName()
  }, [filters, sessionMode])

  const generateSessionName = () => {
    if (sessionName && !sessionName.includes("Session")) {
      return // Don't override user-set names
    }

    // Start with session mode and add session number
    const sessionCount = Math.floor(Math.random() * 99) + 1
    const name = `${sessionMode === "practice" ? "Practice" : "Exam"} Session ${sessionCount.toString().padStart(2, '0')}`

    setSessionName(name)
  }

  const fetchFilterOptions = async () => {
    try {
      // Fetch specialties
      const specialtiesResponse = await fetch("/api/specialties")
      const specialtiesData = await specialtiesResponse.json()
      if (specialtiesData.specialties) {
        setSpecialties(specialtiesData.specialties.map((s: { name: string }) => s.name))
      }

      // Fetch exam types
      const examTypesResponse = await fetch("/api/exam-types")
      const examTypesData = await examTypesResponse.json()
      if (examTypesData.examTypes) {
        setExamTypes(examTypesData.examTypes.map((e: { name: string }) => e.name))
      }

      // Fetch available years from questions
      const yearsResponse = await fetch("/api/questions/years")
      const yearsData = await yearsResponse.json()
      if (yearsData.years) {
        setAvailableYears(yearsData.years.sort((a: number, b: number) => b - a))
      }
    } catch (error) {
      console.error("Error fetching filter options:", error)
    }
  }

  const fetchFilteredQuestions = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/questions/filtered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters,
          userId: user?.id || "anonymous",
        }),
      })

      const data = await response.json()
      if (data.questions) {
        setAvailableQuestions(data.questions)
        setQuestionCount(data.count)
      } else {
        setAvailableQuestions([])
        setQuestionCount(0)
      }
    } catch (error) {
      console.error("Error fetching questions:", error)
      setAvailableQuestions([])
      setQuestionCount(0)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (filterType: keyof QuestionFilters, value: string | number, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: checked 
        ? [...(prev[filterType] as (string | number)[]), value] 
        : (prev[filterType] as (string | number)[]).filter((item) => item !== value),
    }))
  }

  const clearAllFilters = () => {
    setFilters({
      specialties: [],
      years: [],
      difficulties: [],
      examTypes: [],
      questionStatus: [],
    })
  }

  const clearFilterSection = (filterType: keyof QuestionFilters) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: [],
    }))
  }

  const selectAllInSection = (filterType: keyof QuestionFilters) => {
    let allValues: (string | number)[] = []

    switch (filterType) {
      case "specialties":
        allValues = specialties
        break
      case "examTypes":
        allValues = examTypes
        break
      case "years":
        allValues = availableYears
        break
      case "difficulties":
        allValues = difficulties
        break
      case "questionStatus":
        allValues = questionStatuses.map((s) => s.value)
        break
    }

    setFilters((prev) => ({
      ...prev,
      [filterType]: allValues,
    }))
  }

  const getSelectedFiltersCount = () => {
    return Object.values(filters).reduce((total, filterArray) => total + filterArray.length, 0)
  }

  const createSession = async () => {
    if (!sessionName.trim()) {
      alert("Please enter a session name")
      return
    }
    if (questionCount === 0) {
      alert("No questions available with current filters")
      return
    }

    setCreating(true)
    try {
      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          sessionName: sessionName.trim(),
          sessionMode,
          filters,
          questionIds: availableQuestions.map((q) => q.id),
          userId: user?.id || "anonymous",
          timeLimit: sessionMode === "exam" ? timeLimit : null,
        }),
      })

      // ── Handle non-JSON responses gracefully ─────────────────────
      const contentType = res.headers.get("content-type") || ""
      const isJson = contentType.includes("application/json")
      const data: any = isJson ? await res.json() : { ok: false }

      if (!res.ok || !isJson) {
        // Log the raw error page/text so it's visible in the console.
        const raw = isJson ? JSON.stringify(data) : await res.text()
        console.error("Create-session API error:", raw)
        throw new Error(data?.message || "Server error – check console")
      }

      // ── Success ─────────────────────────────────────────────────
      router.push(`/test/${data.session.id}`)
    } catch (err) {
      console.error("Error creating session:", err)
      alert(typeof err === "string" ? err : (err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center bg-background">
        <div className="max-w-md">
          <div className="flex items-center justify-center mb-6">
            <img src="/placeholder.svg" alt="App Logo" className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">MedPrep ET</h1>
          <p className="text-base text-gray-600">
            Please sign in to create a test session.
          </p>
          <Link href="/signin">
            <Button className="mt-4">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">MedPrep ET</h1>
            <Badge variant="outline" className="text-sm">
              Create Test Session
            </Badge>
          </div>
          <div className="flex gap-2">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                Admin Panel
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={fetchFilteredQuestions} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filters Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filter Questions
                    <Badge variant="secondary" className="ml-2">
                      {loading ? "Loading..." : `${questionCount} questions`}
                    </Badge>
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    Clear All
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Leave sections unchecked to include all items from that category
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Specialties */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-medium">
                      Specialties
                      {filters.specialties.length === 0 && (
                        <span className="text-sm text-green-600 font-normal ml-2">(All included)</span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => selectAllInSection("specialties")}
                        className="text-blue-600 p-0 h-auto text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => clearFilterSection("specialties")}
                        className="text-blue-600 p-0 h-auto text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {specialties.map((specialty) => (
                      <div key={specialty} className="flex items-center space-x-2">
                        <Checkbox
                          id={`specialty-${specialty}`}
                          checked={filters.specialties.includes(specialty)}
                          onCheckedChange={(checked) =>
                            handleFilterChange("specialties", specialty, checked as boolean)
                          }
                        />
                        <Label htmlFor={`specialty-${specialty}`} className="text-sm">
                          {specialty}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Years */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-medium">
                      Years
                      {filters.years.length === 0 && (
                        <span className="text-sm text-green-600 font-normal ml-2">(All included)</span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => selectAllInSection("years")}
                        className="text-blue-600 p-0 h-auto text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => clearFilterSection("years")}
                        className="text-blue-600 p-0 h-auto text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {availableYears.map((year) => (
                      <div key={year} className="flex items-center space-x-2">
                        <Checkbox
                          id={`year-${year}`}
                          checked={filters.years.includes(year)}
                          onCheckedChange={(checked) => handleFilterChange("years", year, checked as boolean)}
                        />
                        <Label htmlFor={`year-${year}`} className="text-sm">
                          {year}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-medium">
                      Difficulty
                      {filters.difficulties.length === 0 && (
                        <span className="text-sm text-green-600 font-normal ml-2">(All included)</span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => selectAllInSection("difficulties")}
                        className="text-blue-600 p-0 h-auto text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => clearFilterSection("difficulties")}
                        className="text-blue-600 p-0 h-auto text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {difficulties.map((difficulty) => (
                      <div key={difficulty} className="flex items-center space-x-2">
                        <Checkbox
                          id={`difficulty-${difficulty}`}
                          checked={filters.difficulties.includes(difficulty)}
                          onCheckedChange={(checked) =>
                            handleFilterChange("difficulties", difficulty, checked as boolean)
                          }
                        />
                        <Label htmlFor={`difficulty-${difficulty}`} className="text-sm">
                          {difficulty}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Question Status */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-medium">
                      Question Status
                      {filters.questionStatus.length === 0 && (
                        <span className="text-sm text-green-600 font-normal ml-2">(All included)</span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => selectAllInSection("questionStatus")}
                        className="text-blue-600 p-0 h-auto text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => clearFilterSection("questionStatus")}
                        className="text-blue-600 p-0 h-auto text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {questionStatuses.map((status) => (
                      <div key={status.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status.value}`}
                          checked={filters.questionStatus.includes(status.value as any)}
                          onCheckedChange={(checked) =>
                            handleFilterChange("questionStatus", status.value, checked as boolean)
                          }
                        />
                        <Label htmlFor={`status-${status.value}`} className="text-sm">
                          {status.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exam Types */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-medium">
                      Exam Types
                      {filters.examTypes.length === 0 && (
                        <span className="text-sm text-green-600 font-normal ml-2">(All included)</span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => selectAllInSection("examTypes")}
                        className="text-blue-600 p-0 h-auto text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => clearFilterSection("examTypes")}
                        className="text-blue-600 p-0 h-auto text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {examTypes.map((examType) => (
                      <div key={examType} className="flex items-center space-x-2">
                        <Checkbox
                          id={`examtype-${examType}`}
                          checked={filters.examTypes.includes(examType)}
                          onCheckedChange={(checked) => handleFilterChange("examTypes", examType, checked as boolean)}
                        />
                        <Label htmlFor={`examtype-${examType}`} className="text-sm">
                          {examType}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Summary Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Questions Available:</span>
                  <Badge variant="secondary" className="text-lg font-bold">
                    {loading ? "..." : questionCount}
                  </Badge>
                </div>

                <div>
                  <span className="text-sm text-gray-600 block mb-2">Active Filters:</span>
                  {getSelectedFiltersCount() === 0 ? (
                    <span className="text-sm text-green-600">All questions included</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(filters).map(([key, values]) =>
                        values.map((value: string | number) => (
                          <Badge key={`${key}-${value}`} variant="outline" className="text-xs">
                            {String(value)}
                          </Badge>
                        )),
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Session Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Session Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sessionName">Session Name</Label>
                  <Input
                    id="sessionName"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="Auto-generated name..."
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Name is auto-generated based on your filters and time</p>
                </div>

                <div>
                  <Label htmlFor="sessionMode">Test Mode</Label>
                  <Select value={sessionMode} onValueChange={(value: "practice" | "exam") => setSessionMode(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="practice">Practice Mode</SelectItem>
                      <SelectItem value="exam">Exam Mode</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {sessionMode === "practice"
                      ? "Get immediate feedback after each question"
                      : "Review answers only at the end"}
                  </p>
                </div>

                {sessionMode === "exam" && (
                  <div>
                    <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      value={timeLimit || ""}
                      onChange={(e) => setTimeLimit(e.target.value ? Number.parseInt(e.target.value) : null)}
                      placeholder="Optional"
                      className="mt-1"
                    />
                  </div>
                )}

                <Button
                  onClick={createSession}
                  disabled={creating || questionCount === 0 || !sessionName.trim()}
                  className="w-full"
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {creating ? "Creating..." : "Start Test"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
