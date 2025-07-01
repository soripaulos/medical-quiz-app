"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Trophy, Target, Clock, CheckCircle, XCircle, Flag, RotateCcw, Home, Eye, Brain } from "lucide-react"
import Link from "next/link"
import type { Question, UserSession, UserAnswer, UserQuestionProgress } from "@/lib/types"

interface TestResultsProps {
  sessionId: string
}

interface ResultsData {
  session: UserSession
  questions: Question[]
  userAnswers: UserAnswer[]
  userProgress: UserQuestionProgress[]
  performance: {
    totalQuestions: number
    correctAnswers: number
    incorrectAnswers: number
    unansweredQuestions: number
    accuracy: number
    timeSpent: number
    averageTimePerQuestion: number
  }
  categoryBreakdown: {
    specialty: string
    total: number
    correct: number
    accuracy: number
  }[]
  difficultyBreakdown: {
    level: number
    total: number
    correct: number
    accuracy: number
  }[]
  questionDetails: {
    questionId: string
    questionText: string
    userAnswer: string | null
    correctAnswer: string
    isCorrect: boolean
    timeSpent: number
    difficulty: number
    specialty: string
    isFlagged: boolean
  }[]
}

export function TestResults({ sessionId }: TestResultsProps) {
  const [results, setResults] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)

  useEffect(() => {
    fetchResults()
  }, [sessionId])

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/results`)
      const data = await response.json()

      if (data.results) {
        setResults(data.results)
      }
    } catch (error) {
      console.error("Error fetching results:", error)
    } finally {
      setLoading(false)
    }
  }

  const getPerformanceColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-600"
    if (accuracy >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getPerformanceBadge = (accuracy: number) => {
    if (accuracy >= 90) return { label: "Excellent", color: "bg-green-100 text-green-800" }
    if (accuracy >= 80) return { label: "Good", color: "bg-blue-100 text-blue-800" }
    if (accuracy >= 70) return { label: "Fair", color: "bg-yellow-100 text-yellow-800" }
    if (accuracy >= 60) return { label: "Needs Work", color: "bg-orange-100 text-orange-800" }
    return { label: "Poor", color: "bg-red-100 text-red-800" }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Calculating your results...</p>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Results Not Found</h2>
          <p className="text-gray-600">Unable to load test results.</p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { performance, categoryBreakdown, difficultyBreakdown, questionDetails } = results
  const performanceBadge = getPerformanceBadge(performance.accuracy)

  // Chart data
  const pieData = [
    { name: "Correct", value: performance.correctAnswers, color: "#10b981" },
    { name: "Incorrect", value: performance.incorrectAnswers, color: "#ef4444" },
    { name: "Unanswered", value: performance.unansweredQuestions, color: "#6b7280" },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-gray-900">Test Results</h1>
          </div>
          <div className="flex items-center justify-center gap-4">
            <Badge variant="outline" className="text-sm">
              {results.session.session_name}
            </Badge>
            <Badge variant="outline" className="text-sm">
              {results.session.session_type === "practice" ? "Practice Mode" : "Exam Mode"}
            </Badge>
            <Badge className={performanceBadge.color}>{performanceBadge.label}</Badge>
          </div>
        </div>

        {/* Overall Performance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPerformanceColor(performance.accuracy)}`}>
                {performance.accuracy.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {performance.correctAnswers} of {performance.totalQuestions} correct
              </p>
              <Progress value={performance.accuracy} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(performance.timeSpent)}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatTime(performance.averageTimePerQuestion)} per question
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Correct Answers</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{performance.correctAnswers}</div>
              <p className="text-xs text-muted-foreground">
                {((performance.correctAnswers / performance.totalQuestions) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incorrect Answers</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{performance.incorrectAnswers}</div>
              <p className="text-xs text-muted-foreground">
                {((performance.incorrectAnswers / performance.totalQuestions) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="questions">Question Review</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Distribution</CardTitle>
                </CardHeader>
                <CardContent>
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
                      <Tooltip
                        formatter={(value, name) => [
                          `${value} questions (${(((value as number) / performance.totalQuestions) * 100).toFixed(1)}%)`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 flex flex-wrap justify-center gap-4">
                    {pieData.map((entry, index) => (
                      <div key={`legend-${index}`} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm font-medium">
                          {entry.name}: {entry.value} ({((entry.value / performance.totalQuestions) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Session Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Session Type:</span>
                    <Badge variant="outline">{results.session.session_type === "practice" ? "Practice" : "Exam"}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Questions:</span>
                    <span className="font-bold">{performance.totalQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completion Rate:</span>
                    <span className="font-bold">
                      {(
                        ((performance.totalQuestions - performance.unansweredQuestions) / performance.totalQuestions) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Started:</span>
                    <span className="text-sm">{new Date(results.session.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completed:</span>
                    <span className="text-sm">
                      {results.session.completed_at
                        ? new Date(results.session.completed_at).toLocaleString()
                        : "In Progress"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Specialty Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Specialty</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="specialty" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}%`, "Accuracy"]} />
                      <Bar dataKey="accuracy" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Difficulty Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Difficulty</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={difficultyBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="level" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}%`, "Accuracy"]} />
                      <Bar dataKey="accuracy" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Breakdown Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Specialty Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryBreakdown.map((category) => (
                      <div key={category.specialty} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{category.specialty}</p>
                          <p className="text-sm text-gray-600">
                            {category.correct}/{category.total} questions
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${getPerformanceColor(category.accuracy)}`}>
                            {category.accuracy.toFixed(1)}%
                          </p>
                          <Progress value={category.accuracy} className="w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Difficulty Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {difficultyBreakdown.map((difficulty) => (
                      <div key={difficulty.level} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">Level {difficulty.level}</p>
                          <p className="text-sm text-gray-600">
                            {difficulty.correct}/{difficulty.total} questions
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${getPerformanceColor(difficulty.accuracy)}`}>
                            {difficulty.accuracy.toFixed(1)}%
                          </p>
                          <Progress value={difficulty.accuracy} className="w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Question-by-Question Review</CardTitle>
                <p className="text-sm text-gray-600">Click on any question to view details</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {questionDetails.map((question, index) => (
                    <div
                      key={question.questionId}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        question.isCorrect
                          ? "border-green-200 bg-green-50 hover:bg-green-100"
                          : question.userAnswer
                            ? "border-red-200 bg-red-50 hover:bg-red-100"
                            : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                      }`}
                      onClick={() =>
                        setSelectedQuestion(selectedQuestion === question.questionId ? null : question.questionId)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">Q{index + 1}</span>
                          {question.isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : question.userAnswer ? (
                            <XCircle className="w-5 h-5 text-red-600" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
                          )}
                          {question.isFlagged && <Flag className="w-4 h-4 text-orange-500" />}
                          <span className="text-sm text-gray-600 truncate max-w-md">
                            {question.questionText.substring(0, 80)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">Level {question.difficulty}</Badge>
                          <Badge variant="outline">{question.specialty}</Badge>
                          <span className="text-sm text-gray-500">{formatTime(question.timeSpent)}</span>
                          <Eye className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>

                      {selectedQuestion === question.questionId && (
                        <div className="mt-4 pt-4 border-t space-y-2">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Your Answer: </span>
                              <span className={question.userAnswer ? "" : "text-gray-500"}>
                                {question.userAnswer || "Not Answered"}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Correct Answer: </span>
                              <span className="text-green-600">{question.correctAnswer}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">{question.questionText}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Strengths & Weaknesses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">Strengths</h4>
                    <ul className="space-y-1 text-sm">
                      {categoryBreakdown
                        .filter((cat) => cat.accuracy >= 80)
                        .map((cat) => (
                          <li key={cat.specialty} className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            {cat.specialty} ({cat.accuracy.toFixed(1)}%)
                          </li>
                        ))}
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">Areas for Improvement</h4>
                    <ul className="space-y-1 text-sm">
                      {categoryBreakdown
                        .filter((cat) => cat.accuracy < 70)
                        .map((cat) => (
                          <li key={cat.specialty} className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-500" />
                            {cat.specialty} ({cat.accuracy.toFixed(1)}%)
                          </li>
                        ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
          <Link href="/create-test">
            <Button variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Take Another Test
            </Button>
          </Link>
          <Link href="/">
            <Button>
              <Home className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
