"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Play,
  Filter,
  RefreshCw,
  Settings,
  Target,
  Calendar,
  GraduationCap,
  FileText,
  CheckCircle,
  AlertCircle,
  User,
  LogOut,
  Moon,
  Sun,
  TrendingUp,
  Shield,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import type { Question, QuestionFilters } from "@/lib/types"
import type { UserProfile } from "@/lib/auth"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { UserProgressDashboard } from "./user-progress-dashboard"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/use-toast"

// Helper: safely parse JSON, logs non-JSON text responses for easier debugging
/**
 * Attempts to parse a Response as JSON.
 *  – Returns the parsed JSON on success.
 *  – Returns `null` if the server returned a non-2xx status OR non-JSON body.
 *     In both cases the error text is logged so we can debug without crashing the UI.
 */
async function safeJson(res: Response) {
  const url = res.url || "«unknown»"
  const ct = res.headers.get("content-type") ?? ""

  // If the server signalled failure, read the body as text for the log.
  if (!res.ok) {
    const errText = await res.text()
    console.error(`Request to ${url} failed – ${res.status}:`, errText)
    return null
  }

  // If the body isn't JSON, log & return null
  if (!ct.includes("application/json")) {
    const raw = await res.text()
    console.error(`Non-JSON response from ${url}:`, raw)
    return null
  }

  // Finally, safely parse JSON
  try {
    return await res.json()
  } catch (err) {
    console.error(`JSON parse error for ${url}:`, err)
    return null
  }
}

interface TestPreset {
  id: string
  name: string
  description: string
  filters: Partial<QuestionFilters>
  sessionMode: "practice" | "exam"
  timeLimit?: number
  icon: React.ReactNode
}

interface EnhancedCreateTestInterfaceProps {
  userProfile: UserProfile
}

export function EnhancedCreateTestInterface({ userProfile }: EnhancedCreateTestInterfaceProps) {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
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
  const [maxQuestions, setMaxQuestions] = useState<number | null>(null)
  const [randomizeOrder, setRandomizeOrder] = useState(true)
  const [creating, setCreating] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [trackProgress, setTrackProgress] = useState(true)

  // Available options from database
  const [specialties, setSpecialties] = useState<string[]>([])
  const [examTypes, setExamTypes] = useState<string[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])

  // Test presets
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
    validateTestConfiguration()
  }, [filters, maxQuestions])

  useEffect(() => {
    generateSessionName()
  }, [filters, sessionMode, sessionName])

  const generateSessionName = () => {
    if (sessionName && !sessionName.includes(new Date().toLocaleTimeString().slice(0, 5))) {
      return // Don't override user-set names
    }

    const now = new Date()
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })

    let name = `${sessionMode === "practice" ? "Practice" : "Exam"} ${timeStr}`

    // Add specialty if only one is selected
    if (filters.specialties.length === 1) {
      const specialty = filters.specialties[0]
      const shortName = specialty
        .split(" ")
        .map((word) => word.charAt(0))
        .join("")
      name = `${shortName} ${name}`
    }

    // Add year if only one is selected
    if (filters.years.length === 1) {
      name = `${filters.years[0]} ${name}`
    }

    // Add difficulty range if specific difficulties selected
    if (filters.difficulties.length > 0 && filters.difficulties.length < 5) {
      const minDiff = Math.min(...filters.difficulties)
      const maxDiff = Math.max(...filters.difficulties)
      if (minDiff === maxDiff) {
        name = `L${minDiff} ${name}`
      } else {
        name = `L${minDiff}-${maxDiff} ${name}`
      }
    }

    setSessionName(name)
  }

  const fetchFilterOptions = async () => {
    try {
      // Fetch specialties
      const specialtiesRes = await fetch("/api/specialties")
      const specialtiesData = (await safeJson(specialtiesRes)) as any
      if (specialtiesData?.specialties) {
        setSpecialties(specialtiesData.specialties.map((s: { name: string }) => s.name))
      }

      // Fetch exam types
      const examTypesRes = await fetch("/api/exam-types")
      const examTypesData = (await safeJson(examTypesRes)) as any
      if (examTypesData?.examTypes) {
        setExamTypes(examTypesData.examTypes.map((e: { name: string }) => e.name))
      }

      // Fetch available years
      const yearsRes = await fetch("/api/questions/years")
      const yearsData = (await safeJson(yearsRes)) as any
      if (yearsData?.years) {
        setAvailableYears(yearsData.years.sort((a: number, b: number) => b - a))
      }
    } catch (error) {
      // This will catch network errors or JSON parsing failures
      console.error("Error fetching filter options:", error)
    }
  }

  const fetchFilteredQuestions = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/questions/filtered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters, userId: user?.id }),
      })

      const data = await safeJson(res)

      if (!res.ok || !data) {
        throw new Error(data?.message || `Server returned ${res.status}`)
      }

      if (data?.questions) {
        setAvailableQuestions(data.questions)
        setQuestionCount(data.count)
      } else {
        setAvailableQuestions([])
        setQuestionCount(0)
        if (process.env.NODE_ENV === "development") {
          alert("Failed to load questions. Check the console for errors.")
        }
      }
    } catch (err) {
      console.error("Error fetching questions:", err)
      setAvailableQuestions([])
      setQuestionCount(0)
      if (process.env.NODE_ENV === "development") {
        alert("Failed to load questions. Check the console for errors.")
      }
    } finally {
      setLoading(false)
    }
  }

  const validateTestConfiguration = () => {
    const errors: string[] = []

    if (questionCount === 0) {
      errors.push("No questions match your current filters")
    }

    if (maxQuestions && maxQuestions > questionCount) {
      errors.push(`Cannot create test with ${maxQuestions} questions when only ${questionCount} are available`)
    }

    if (maxQuestions && maxQuestions > 200) {
      errors.push("Maximum 200 questions allowed per session")
    }

    if (sessionMode === "exam" && timeLimit && timeLimit < 1) {
      errors.push("Exam time limit must be at least 1 minute")
    }

    if (sessionMode === "exam" && !timeLimit) {
      errors.push("Exam mode requires a time limit")
    }

    setValidationErrors(errors)
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
    setMaxQuestions(null)
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

  const getFinalQuestionCount = () => {
    const limit = maxQuestions ? Math.min(maxQuestions, questionCount, 200) : Math.min(questionCount, 200)
    return limit
  }

  const createSession = async () => {
    if (!sessionName.trim()) {
      alert("Please enter a session name")
      return
    }

    if (validationErrors.length > 0) {
      alert("Please fix the validation errors before creating the test")
      return
    }

    setCreating(true)
    try {
      const questionIds = availableQuestions.map((q) => q.id)
      const finalQuestionIds = maxQuestions ? questionIds.slice(0, maxQuestions) : questionIds

      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          sessionName: sessionName.trim(),
          sessionMode,
          filters,
          questionIds: finalQuestionIds,
          userId: user?.id,
          timeLimit: sessionMode === "exam" ? timeLimit : null,
          randomizeOrder,
          trackProgress: sessionMode === "practice" ? trackProgress : true,
        }),
      })

      const contentType = res.headers.get("content-type") || ""
      const isJson = contentType.includes("application/json")
      const data: any = isJson ? await res.json() : { ok: false }

      if (!res.ok || !isJson) {
        const raw = isJson ? JSON.stringify(data) : await res.text()
        console.error("Create-session API error:", raw)
        throw new Error(data?.message || "Server error – check console")
      }

      router.push(`/test/${data.session.id}`)
    } catch (err) {
      console.error("Error creating session:", err)
      alert(typeof err === "string" ? err : (err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const getEstimatedTime = () => {
    const finalCount = getFinalQuestionCount()
    const averageTimePerQuestion = sessionMode === "exam" ? 1.5 : 2 // minutes
    return Math.ceil(finalCount * averageTimePerQuestion)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      // The AuthProvider will automatically redirect to /login after signOut
    } catch (error) {
      console.error("Error signing out:", error)
      // Force redirect to login if signOut fails
      router.push("/login")
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">MedPrep ET</h1>
          </div>
          <div className="flex items-center space-x-4">
            {userProfile?.role === "admin" && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex items-center gap-2">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                  <User className="w-4 h-4" />
                  {user?.user_metadata?.full_name || user?.email}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-3">
                  <div className="border-b pb-3">
                    <p className="font-medium">{user?.user_metadata?.full_name || "User"}</p>
                    <p className="text-sm text-gray-600">{user?.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>
      <main className="w-full p-4 md:p-6 lg:p-8">
        <Tabs defaultValue="custom" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="custom">Create Test</TabsTrigger>
            <TabsTrigger value="progress">My Progress</TabsTrigger>
          </TabsList>

          {userProfile ? (
            <>
              <TabsContent value="custom" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* Left Column: Question Filters */}
                  <Card className="lg:col-span-2">
                    <CardHeader className="dark:bg-card bg-primary text-primary-foreground">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Filter className="h-6 w-6" />
                          <div className="flex items-center gap-3">
                            <CardTitle>Question Filters</CardTitle>
                            <Badge
                              variant="outline"
                              className="bg-transparent text-primary-foreground border-primary-foreground/50"
                            >
                              {questionCount} questions
                            </Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                          Clear All
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid gap-8">
                        {/* Specialties */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-base font-medium">
                              <GraduationCap className="w-4 h-4 inline mr-2" />
                              Specialties
                              {filters.specialties.length === 0 && (
                                <span className="text-sm text-green-600 font-normal ml-2">(All)</span>
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

                        <Separator />

                        {/* Years */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-base font-medium">
                              <Calendar className="w-4 h-4 inline mr-2" />
                              Years
                              {filters.years.length === 0 && (
                                <span className="text-sm text-green-600 font-normal ml-2">(All)</span>
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

                        <Separator />

                        {/* Difficulty */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-base font-medium">
                              <Target className="w-4 h-4 inline mr-2" />
                              Difficulty
                              {filters.difficulties.length === 0 && (
                                <span className="text-sm text-green-600 font-normal ml-2">(All)</span>
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

                        <Separator />

                        {/* Question Status */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-base font-medium">
                              <CheckCircle className="w-4 h-4 inline mr-2" />
                              Question Status
                              {filters.questionStatus.length === 0 && (
                                <span className="text-sm text-green-600 font-normal ml-2">(All)</span>
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

                        <Separator />

                        {/* Exam Types */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-base font-medium">
                              <FileText className="w-4 h-4 inline mr-2" />
                              Exam Types
                              {filters.examTypes.length === 0 && (
                                <span className="text-sm text-green-600 font-normal ml-2">(All)</span>
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
                                  onCheckedChange={(checked) =>
                                    handleFilterChange("examTypes", examType, checked as boolean)
                                  }
                                />
                                <Label htmlFor={`examtype-${examType}`} className="text-sm">
                                  {examType}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Test Settings Panel */}
                  <div className="space-y-6">
                    <Card>
                      <CardHeader className="dark:bg-card bg-primary text-primary-foreground">
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="w-5 h-5" />
                          Test Configuration
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="sessionName">Test Name</Label>
                          <Input
                            id="sessionName"
                            value={sessionName}
                            onChange={(e) => setSessionName(e.target.value)}
                            placeholder="Auto-generated name..."
                            className="mt-1"
                          />
                          <p className="text-xs text-gray-500 mt-1">Name is auto-generated based on your settings</p>
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

                        {sessionMode === "practice" && (
                          <div className="border border-blue-200 rounded-lg p-4 bg-transparent">
                            <div className="flex items-start space-x-3">
                              <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Checkbox
                                    id="trackProgress"
                                    checked={trackProgress}
                                    onCheckedChange={(checked) => setTrackProgress(checked as boolean)}
                                  />
                                  <Label htmlFor="trackProgress" className="text-sm font-medium">
                                    Track my progress
                                  </Label>
                                </div>
                                <p className="text-xs text-gray-600">
                                  {trackProgress
                                    ? "Your answers will be recorded and used to track your performance over time. This helps with filtering questions by status (answered, correct, incorrect)."
                                    : "Your answers will not be saved to your progress history. Use this for casual practice without affecting your statistics."}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div>
                          <Label htmlFor="maxQuestions">Number of Questions</Label>
                          <Input
                            id="maxQuestions"
                            type="number"
                            value={maxQuestions || ""}
                            onChange={(e) => setMaxQuestions(e.target.value ? Number.parseInt(e.target.value) : null)}
                            placeholder={`All ${questionCount} questions`}
                            className="mt-1"
                            min="1"
                            max={Math.min(questionCount, 200)}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Limit the number of questions in your test (max 200 per session)
                          </p>
                        </div>

                        {sessionMode === "exam" && (
                          <div>
                            <Label htmlFor="timeLimit">Time Limit (minutes) *</Label>
                            <Input
                              id="timeLimit"
                              type="number"
                              value={timeLimit || ""}
                              onChange={(e) => setTimeLimit(e.target.value ? Number.parseInt(e.target.value) : null)}
                              placeholder="Required for exam mode"
                              className="mt-1"
                              min="1"
                              required
                            />
                            <p className="text-xs text-gray-500 mt-1">Estimated time: {getEstimatedTime()} minutes</p>
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="randomizeOrder"
                            checked={randomizeOrder}
                            onCheckedChange={(checked) => setRandomizeOrder(checked as boolean)}
                          />
                          <Label htmlFor="randomizeOrder" className="text-sm">
                            Randomize question order
                          </Label>
                        </div>

                        <Separator className="my-4" />

                        {validationErrors.length > 0 && (
                          <Alert className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              <ul className="list-disc list-inside space-y-1">
                                {validationErrors.map((error, index) => (
                                  <li key={index} className="text-sm">
                                    {error}
                                  </li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        <Button
                          onClick={createSession}
                          disabled={creating || validationErrors.length > 0 || !sessionName.trim()}
                          className="w-full"
                          size="lg"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {creating ? "Creating Test..." : "Start Test"}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Stats</CardTitle>
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
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="progress" className="h-full">
                <UserProgressDashboard />
              </TabsContent>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          )}
        </Tabs>
      </main>
    </div>
  )
}
