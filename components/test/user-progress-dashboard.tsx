"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Trophy, Target, Clock, BookOpen, Eye, FileText, GraduationCap, Timer, BookOpenCheck, ChevronDown, ChevronUp } from "lucide-react"
import { SourcesDisplay } from "@/components/ui/sources-display"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface UserStats {
  totalSessions: number
  totalQuestions: number
  totalCorrect: number
  totalIncorrect: number
  totalAttemptedQuestions: number
  totalTimeSpent: number
  averageScore: number
  totalUniqueQuestions: number
  answerDistribution: {
    correct: number
    incorrect: number
    unanswered: number
  }
}

interface SessionHistory {
  id: string
  name: string
  type: string
  date: string
  score: number
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  timeSpent: number
  isCompleted: boolean
}

interface CategoryPerformance {
  category: string
  total: number
  correct: number
  accuracy: number
}

interface ProgressData {
  sessionNumber: number
  sessionName: string
  date: string
  sessionAccuracy: number
  cumulativeAccuracy: number
  questionsAnswered: number
  totalQuestionsAnswered: number
}

interface UserNote {
  id: string
  noteText: string
  questionId: string
  questionText: string
  questionPreview: string
  choices: { letter: string; text: string }[]
  correctAnswer: string
  explanation?: string
  sources?: string
  specialty: string
  createdAt: string
  updatedAt: string
}

export function UserProgressDashboard() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [sessionHistory, setSessionHistory] = useState<SessionHistory[]>([])
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([])
  const [progressData, setProgressData] = useState<ProgressData[]>([])
  const [userNotes, setUserNotes] = useState<UserNote[]>([])
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [uniqueQuestions, setUniqueQuestions] = useState({
    uniqueQuestions: 0,
    totalQuestions: 0,
    percentageAttempted: 0,
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)

      // Clean up orphaned sessions first, but only if there's no active session in localStorage
      const activeSession = localStorage.getItem('activeTestSession')
      if (!activeSession) {
        try {
          await fetch("/api/sessions/cleanup", { method: "POST" })
        } catch (error) {
          console.error("Error cleaning up orphaned sessions:", error)
        }
      }

      // Fetch all data in parallel
      const [statsRes, historyRes, categoryRes, progressRes, notesRes, uniqueRes] = await Promise.all([
        fetch("/api/user/stats"),
        fetch("/api/user/session-history"),
        fetch("/api/user/category-performance"),
        fetch("/api/user/progress-over-time"),
        fetch("/api/user/notes"),
        fetch("/api/user/unique-questions"),
      ])

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      } else {
        console.error("Failed to fetch stats:", statsRes.status)
      }

      if (historyRes.ok) {
        const data = await historyRes.json()
        setSessionHistory(data.sessions || [])
      } else {
        console.error("Failed to fetch session history:", historyRes.status)
      }

      if (categoryRes.ok) {
        const data = await categoryRes.json()
        setCategoryPerformance(data.categoryPerformance || [])
      } else {
        console.error("Failed to fetch category performance:", categoryRes.status)
      }

      if (progressRes.ok) {
        const data = await progressRes.json()
        setProgressData(data.progressData || [])
      } else {
        console.error("Failed to fetch progress data:", progressRes.status)
      }

      if (notesRes.ok) {
        const data = await notesRes.json()
        setUserNotes(data.notes || [])
      } else {
        console.error("Failed to fetch notes:", notesRes.status)
      }

      if (uniqueRes.ok) {
        const data = await uniqueRes.json()
        setUniqueQuestions(data || { uniqueQuestions: 0, totalQuestions: 0, percentageAttempted: 0 })
      } else {
        console.error("Failed to fetch unique questions:", uniqueRes.status)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const totalSeconds = seconds || 0
    const totalMinutes = Math.floor(totalSeconds / 60)
    const hours = Math.floor(totalMinutes / 60)
    const remainingMinutes = totalMinutes % 60

    if (totalMinutes >= 60) {
      return `${hours}h ${remainingMinutes}m`
    }
    return `${totalMinutes} minutes`
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(noteId)) {
        newSet.delete(noteId)
      } else {
        newSet.add(noteId)
      }
      return newSet
    })
  }

  const getSessionTypeIcon = (type: string) => {
    return type === 'exam' ? <Timer className="w-4 h-4 text-red-500" /> : <BookOpenCheck className="w-4 h-4 text-blue-500" />
  }

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`
  }

  const pieData = stats && stats.answerDistribution
    ? [
        { name: "Correct", value: stats.answerDistribution.correct, color: "#10b981" },
        { name: "Incorrect", value: stats.answerDistribution.incorrect, color: "#ef4444" },
        { name: "Unanswered", value: stats.answerDistribution.unanswered, color: "#6b7280" },
      ]
    : []

  // Check if we have valid data
  const hasValidData = pieData.some(item => item.value > 0)

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log("Stats:", stats)
    console.log("Answer Distribution:", stats?.answerDistribution)
    console.log("Pie Data:", pieData)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your progress...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 md:p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">My Progress Dashboard</h1>
          <p className="text-muted-foreground">Track your learning journey and performance</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(stats?.averageScore || 0)}`}>
                {stats?.averageScore?.toFixed(1) || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalCorrect || 0} of {stats?.totalAttemptedQuestions || 0} correct
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatTime(stats?.totalTimeSpent || 0)}</div>
              <p className="text-xs text-muted-foreground">Across {stats?.totalSessions || 0} sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Questions Attempted</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{uniqueQuestions.uniqueQuestions}</div>
              <p className="text-xs text-muted-foreground">
                {uniqueQuestions.percentageAttempted.toFixed(1)}% of total questions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Sessions</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.totalSessions || 0}</div>
              <p className="text-xs text-muted-foreground">Total completed sessions</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-10">
              <TabsTrigger value="overview" className="text-xs sm:text-sm py-2 sm:py-1">Overview</TabsTrigger>
              <TabsTrigger value="history" className="text-xs sm:text-sm py-2 sm:py-1">Test History</TabsTrigger>
              <TabsTrigger value="performance" className="text-xs sm:text-sm py-2 sm:py-1">Performance</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs sm:text-sm py-2 sm:py-1">Notes</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Answer Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Answer Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {hasValidData ? (
                    <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${(value as number).toFixed(1)}%`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 flex flex-wrap justify-center gap-4">
                    {pieData.map((entry, index) => (
                      <div key={`legend-${index}`} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm font-medium">
                          {entry.name}: {entry.value.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-gray-500">
                      <div className="text-center">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium">No data available</p>
                        <p className="text-sm">Start answering questions to see your distribution</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sessionHistory.slice(0, 5).map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{session.name}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(session.date).toLocaleDateString()} • {session.timeSpent}m
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${getScoreColor(session.score)}`}>{session.score.toFixed(1)}%</p>
                          <p className="text-sm text-gray-600">
                            {session.correctAnswers}/{session.totalQuestions}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test History ({sessionHistory.length} tests)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Test Name</TableHead>
                        <TableHead className="text-xs sm:text-sm w-16">Date</TableHead>
                        <TableHead className="text-xs sm:text-sm w-16">Score</TableHead>
                        <TableHead className="text-xs sm:text-sm w-20">Q's</TableHead>
                        <TableHead className="text-xs sm:text-sm w-8 hidden sm:table-cell">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionHistory.map((session) => (
                        <TableRow 
                          key={session.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/test/${session.id}/results`)}
                        >
                          <TableCell className="font-medium text-xs sm:text-sm">
                            <div className="flex items-center justify-between">
                              <div className="truncate max-w-[120px] sm:max-w-none">
                                {session.name}
                              </div>
                              <Button 
                                asChild 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 sm:hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link href={`/test/${session.id}/results`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {formatShortDate(session.date)}
                          </TableCell>
                          <TableCell className={`text-xs sm:text-sm font-bold ${getScoreColor(session.score)}`}>
                            {session.score.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {session.correctAnswers}/{session.totalQuestions}
                          </TableCell>
                          <TableCell className="text-center hidden sm:table-cell">
                            <Button 
                              asChild 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link href={`/test/${session.id}/results`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={categoryPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, "Accuracy"]} />
                    <Bar dataKey="accuracy" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Progress Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sessionNumber" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [
                        `${value}%`,
                        name === "sessionAccuracy" ? "Session Score" : "Overall Average",
                      ]}
                      labelFormatter={(label) => `Session ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="sessionAccuracy"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="sessionAccuracy"
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativeAccuracy"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="cumulativeAccuracy"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            </div>
          </TabsContent>



          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Notes ({userNotes.length} notes)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userNotes.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No notes yet. Start taking notes during your practice sessions!</p>
                    </div>
                  ) : (
                    userNotes.map((note) => (
                      <div key={note.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline">{note.specialty}</Badge>
                          <span className="text-sm text-gray-500">{new Date(note.updatedAt).toLocaleDateString()}</span>
                        </div>
                        
                        {/* Question Preview with Toggle */}
                        <div 
                          className="cursor-pointer hover:bg-muted p-2 rounded mb-2"
                          onClick={() => toggleNoteExpansion(note.id)}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground flex-1">{note.questionPreview}</p>
                            {expandedNotes.has(note.id) ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground ml-2" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground ml-2" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Question Details */}
                        {expandedNotes.has(note.id) && (
                          <div className="mb-4 p-3 bg-muted rounded border">
                            <div className="space-y-3">
                              {/* Full Question Text */}
                              <div>
                                <h4 className="font-medium text-sm mb-2">Question:</h4>
                                <p className="text-sm text-foreground">{note.questionText}</p>
                              </div>

                              {/* Answer Choices */}
                              {note.choices && note.choices.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-sm mb-2">Answer Choices:</h4>
                                  <div className="space-y-1">
                                    {note.choices.map((choice) => (
                                      <div 
                                        key={choice.letter} 
                                        className={`p-2 rounded text-sm ${
                                          choice.letter === note.correctAnswer 
                                            ? 'bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800' 
                                            : 'bg-background border border-border'
                                        }`}
                                      >
                                        <span className="font-medium">{choice.letter}. </span>
                                        <span>{choice.text}</span>
                                        {choice.letter === note.correctAnswer && (
                                          <span className="ml-2 text-green-600 dark:text-green-400 font-medium text-xs">(Correct)</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Explanation */}
                              {note.explanation && (
                                <div>
                                  <h4 className="font-medium text-sm mb-2">Explanation:</h4>
                                  <p className="text-sm text-foreground">{note.explanation}</p>
                                </div>
                              )}

                              {/* Sources */}
                              {note.sources && (
                                <div>
                                  <h4 className="font-medium text-sm mb-2">Sources:</h4>
                                  <SourcesDisplay sources={note.sources} />
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* User Note */}
                        <div>
                          <h4 className="font-medium text-sm mb-2">Your Note:</h4>
                          <p className="text-foreground">{note.noteText}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
