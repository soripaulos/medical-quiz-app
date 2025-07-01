"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import {
  TrendingUp,
  Target,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Filter,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"
import { format } from "date-fns"

interface UserStats {
  totalSessions: number
  completedSessions: number
  averageScore: number
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  unansweredQuestions: number
  totalTimeSpent: number
  averageTimePerQuestion: number
  totalNotes: number
}

interface SessionHistory {
  id: string
  session_name: string
  session_type: "practice" | "exam"
  completed_at: string
  score: number
  total_questions: number
  correct_answers: number
  time_spent: number
}

interface CategoryPerformance {
  category: string
  total: number
  correct: number
  incorrect: number
  accuracy: number
}

interface ProgressOverTime {
  date: string
  accuracy: number
  sessionsCount: number
}

interface UserNote {
  id: string
  question_id: string
  note_text: string
  created_at: string
  question_text: string
  specialty: string
  choice_a: string
  choice_b: string
  choice_c: string
  choice_d: string
  choice_e: string
  correct_answer: string
}

const COLORS = ["#10b981", "#ef4444", "#6b7280", "#3b82f6", "#f59e0b"]

// Safely formats numbers to one‐decimal percentages, preventing "toFixed" errors
const formatPercent = (value: unknown) => {
  const num = typeof value === "number" && !isNaN(value) ? value : 0
  return num.toFixed(1)
}

export function UserProgressDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [sessionHistory, setSessionHistory] = useState<SessionHistory[]>([])
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([])
  const [progressOverTime, setProgressOverTime] = useState<ProgressOverTime[]>([])
  const [userNotes, setUserNotes] = useState<UserNote[]>([])

  // Filters
  const [dateFilter, setDateFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [scoreFilter, setScoreFilter] = useState("all")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    if (user?.id) {
      fetchUserStats()
    }
  }, [user?.id])

  const fetchUserStats = async () => {
    setLoading(true)
    try {
      const [statsRes, historyRes, categoryRes, progressRes, notesRes, uniqueQuestionsRes] = await Promise.all([
        fetch(`/api/user/stats?userId=${user?.id}`),
        fetch(`/api/user/session-history?userId=${user?.id}`),
        fetch(`/api/user/category-performance?userId=${user?.id}`),
        fetch(`/api/user/progress-over-time?userId=${user?.id}`),
        fetch(`/api/user/notes?userId=${user?.id}`),
        fetch(`/api/user/unique-questions?userId=${user?.id}`),
      ])

      const [statsData, historyData, categoryData, progressData, notesData, uniqueQuestionsData] = await Promise.all([
        statsRes.json(),
        historyRes.json(),
        categoryRes.json(),
        progressRes.json(),
        notesRes.json(),
        uniqueQuestionsRes.json(),
      ])

      setStats({
        ...statsData,
        totalQuestions: uniqueQuestionsData.uniqueQuestions || 0,
      })
      setSessionHistory(historyData.sessions || [])
      setCategoryPerformance(categoryData.categories || [])
      setProgressOverTime(progressData.progress || [])
      setUserNotes(notesData.notes || [])
    } catch (error) {
      console.error("Error fetching user stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSessions = sessionHistory
    .filter((session) => {
      const sessionDate = new Date(session.completed_at)
      const now = new Date()

      // Date filter
      if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        if (sessionDate < weekAgo) return false
      } else if (dateFilter === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        if (sessionDate < monthAgo) return false
      }

      // Type filter
      if (typeFilter !== "all" && session.session_type !== typeFilter) return false

      // Score filter
      if (scoreFilter === "high" && session.score < 80) return false
      if (scoreFilter === "medium" && (session.score < 60 || session.score >= 80)) return false
      if (scoreFilter === "low" && session.score >= 60) return false

      return true
    })
    .sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case "date":
          aValue = new Date(a.completed_at)
          bValue = new Date(b.completed_at)
          break
        case "score":
          aValue = a.score
          bValue = b.score
          break
        case "name":
          aValue = a.session_name
          bValue = b.session_name
          break
        default:
          aValue = new Date(a.completed_at)
          bValue = new Date(b.completed_at)
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const pieData = stats
    ? (() => {
        // Calculate total questions from all sessions
        const totalSessionQuestions = sessionHistory.reduce((acc, session) => acc + session.total_questions, 0)

        // If no sessions, use the answered questions count as fallback
        const totalQuestions = totalSessionQuestions > 0 ? totalSessionQuestions : stats.totalQuestions

        const correctAnswers = stats.correctAnswers ?? 0
        const incorrectAnswers = stats.incorrectAnswers ?? 0
        const unansweredQuestions = Math.max(0, totalQuestions - correctAnswers - incorrectAnswers)

        return [
          { name: "Correct", value: correctAnswers, color: "#10b981" },
          { name: "Incorrect", value: incorrectAnswers, color: "#ef4444" },
          { name: "Unanswered", value: unansweredQuestions, color: "#6b7280" },
        ]
      })()
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your progress...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Progress Data Yet</h3>
        <p className="text-gray-600 mb-4">Start taking tests to see your progress and statistics here.</p>
        <Button onClick={() => window.location.reload()}>
          <TrendingUp className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>
    )
  }

  const totalSeconds = stats?.totalTimeSpent ?? 0
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tests Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{formatPercent(stats.averageScore)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Questions Answered</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Time Spent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {hours}h {minutes}m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Test History</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="notes">My Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Answer Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={false}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [value, "Questions"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {pieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-sm">
                        {entry.name}: {entry.value} (
                        {formatPercent(
                          pieData.reduce((sum, item) => sum + item.value, 0)
                            ? (entry.value / pieData.reduce((sum, item) => sum + item.value, 0)) * 100
                            : 0,
                        )}
                        %)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Progress Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Progress Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={progressOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: any) => [`${value}%`, "Accuracy"]} />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Category Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={categoryPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="correct" stackId="a" fill="#10b981" name="Correct" />
                  <Bar dataKey="incorrect" stackId="a" fill="#ef4444" name="Incorrect" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter & Sort
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="dateFilter">Date Range</Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="week">Last Week</SelectItem>
                      <SelectItem value="month">Last Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="typeFilter">Test Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="practice">Practice</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="scoreFilter">Score Range</Label>
                  <Select value={scoreFilter} onValueChange={setScoreFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Scores</SelectItem>
                      <SelectItem value="high">High (80%+)</SelectItem>
                      <SelectItem value="medium">Medium (60-79%)</SelectItem>
                      <SelectItem value="low">&lt;60%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sortBy">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="score">Score</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sortOrder">Order</Label>
                  <Button
                    variant="outline"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="w-full justify-between"
                  >
                    {sortOrder === "asc" ? "Ascending" : "Descending"}
                    {sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Test History ({filteredSessions.length} tests)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">{session.session_name}</TableCell>
                        <TableCell>
                          <Badge variant={session.session_type === "exam" ? "default" : "secondary"}>
                            {session.session_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(session.completed_at), "MMM dd, yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${
                                session.score >= 80
                                  ? "text-green-600"
                                  : session.score >= 60
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {formatPercent(session.score)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {session.correct_answers}/{session.total_questions}
                        </TableCell>
                        <TableCell>{session.time_spent}m</TableCell>
                        <TableCell>
                          <Link href={`/test/${session.id}/results`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {categoryPerformance.map((category) => (
              <Card key={category.category}>
                <CardHeader>
                  <CardTitle className="text-lg">{category.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Accuracy</span>
                      <span className="font-medium">{formatPercent(category.accuracy)}%</span>
                    </div>
                    <Progress value={category.accuracy} className="h-2" />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>{category.correct} correct</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span>{category.incorrect} incorrect</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                My Notes ({userNotes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userNotes.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No notes yet. Start adding notes to questions during your tests!</p>
                  </div>
                ) : (
                  userNotes.map((note) => (
                    <Card key={note.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">{note.specialty}</Badge>
                            <span className="text-sm text-gray-500">
                              {format(new Date(note.created_at), "MMM dd, yyyy")}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-900">{note.question_text}</p>

                            <div className="space-y-1">
                              {[
                                { key: "A", text: note.choice_a },
                                { key: "B", text: note.choice_b },
                                { key: "C", text: note.choice_c },
                                { key: "D", text: note.choice_d },
                                { key: "E", text: note.choice_e },
                              ]
                                .filter((choice) => choice.text)
                                .map((choice) => (
                                  <div
                                    key={choice.key}
                                    className={`text-sm p-2 rounded ${
                                      choice.key === note.correct_answer
                                        ? "bg-green-50 text-green-800 border border-green-200"
                                        : "bg-gray-50 text-gray-700"
                                    }`}
                                  >
                                    <span className="font-medium">{choice.key}.</span> {choice.text}
                                    {choice.key === note.correct_answer && (
                                      <span className="ml-2 text-xs font-medium text-green-600">(Correct)</span>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </div>

                          <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-l-blue-400">
                            <p className="text-sm font-medium text-blue-900 mb-1">My Note:</p>
                            <p className="text-sm text-blue-800">{note.note_text}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
