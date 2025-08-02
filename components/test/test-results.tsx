"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SourcesDisplay } from "@/components/ui/sources-display"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Trophy, Target, Clock, CheckCircle, XCircle, Flag, RotateCcw, Home, Eye, Brain, Check, X, Calendar, HelpCircle, Repeat, AlertCircle } from "lucide-react"
import Link from "next/link"
import type { Question, UserSession, UserAnswer, UserQuestionProgress } from "@/lib/types"
import { useAuth } from "@/hooks/use-auth"
import { FullPageSpinner } from "@/components/ui/loading-spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
    choices?: { letter: string; text: string }[]
    userAnswerText?: string
    correctAnswerText?: string
    explanation?: string
    sources?: string
  }[]
}

export function TestResults({ sessionId }: TestResultsProps) {
  const [results, setResults] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    fetchResults()
  }, [sessionId])

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/results`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch results: ${response.status}`)
      }
      
      const data = await response.json()

      if (data.error) {
        console.error("Results API error:", data.error)
        return
      }

      // Transform API response to match expected ResultsData format
      const transformedResults: ResultsData = {
        session: data.session,
        questions: data.questions || [],
        userAnswers: data.questions?.map((q: any) => q.userAnswer).filter(Boolean) || [],
        userProgress: data.questions?.map((q: any) => ({
          question_id: q.id,
          user_id: data.session.user_id,
          is_flagged: q.isFlagged || false,
          notes: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })) || [],
        performance: {
          totalQuestions: data.statistics.totalQuestions,
          correctAnswers: data.statistics.correctAnswers,
          incorrectAnswers: data.statistics.incorrectAnswers,
          unansweredQuestions: data.statistics.unansweredQuestions,
          accuracy: data.statistics.scorePercentage,
          timeSpent: data.statistics.totalTimeSeconds,
          averageTimePerQuestion: data.statistics.averageTimePerQuestion
        },
        categoryBreakdown: Object.entries(data.breakdown.bySpecialty).map(([specialty, stats]: [string, any]) => ({
          specialty,
          total: stats.total,
          correct: stats.correct,
          accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
        })),
        difficultyBreakdown: Object.entries(data.breakdown.byDifficulty).map(([level, stats]: [string, any]) => ({
          level: parseInt(level) || 0,
          total: stats.total,
          correct: stats.correct,
          accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
        })),
        questionDetails: data.questions?.map((q: any) => {
          const userAnswer = q.userAnswer
          return {
            questionId: q.id,
            questionText: q.question_text,
            userAnswer: userAnswer?.selected_choice_letter || null,
            correctAnswer: q.correct_answer,
            isCorrect: userAnswer?.is_correct || false,
            timeSpent: q.timeSpent || 0,
            difficulty: q.difficulty || 1,
            specialty: q.specialty?.name || "Unknown",
            isFlagged: q.isFlagged || false,
            choices: [
              { letter: "A", text: q.choice_a },
              { letter: "B", text: q.choice_b },
              { letter: "C", text: q.choice_c },
              { letter: "D", text: q.choice_d },
              q.choice_e && { letter: "E", text: q.choice_e },
              q.choice_f && { letter: "F", text: q.choice_f }
            ].filter(Boolean),
            userAnswerText: userAnswer ? (() => {
              const choiceKey = `choice_${userAnswer.selected_choice_letter?.toLowerCase()}`
              return q[choiceKey] || userAnswer.selected_choice_letter
            })() : null,
            correctAnswerText: (() => {
              const choiceKey = `choice_${q.correct_answer?.toLowerCase()}`
              return q[choiceKey] || q.correct_answer
            })(),
            explanation: q.explanation,
            sources: q.sources
          }
        }) || []
      }

      setResults(transformedResults)
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

  const formatTimeSpent = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (loading) {
    return <FullPageSpinner />
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Alert className="max-w-md">
          <HelpCircle className="h-4 w-4" />
          <AlertTitle>No Results Found</AlertTitle>
          <AlertDescription>
            The test session could not be found or results are not available.{" "}
            <Link href="/" className="underline">
              Go back home
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const { performance, categoryBreakdown, questionDetails } = results
  const performanceBadge = getPerformanceBadge(performance.accuracy)

  // Chart data
  const pieData = [
    { name: "Correct", value: performance.correctAnswers, color: "#10b981" },
    { name: "Incorrect", value: performance.incorrectAnswers, color: "#ef4444" },
    { name: "Unanswered", value: performance.unansweredQuestions, color: "#6b7280" },
  ]

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 md:p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-foreground">Test Results</h1>
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
              <div className="text-2xl font-bold">{formatTimeSpent(performance.timeSpent)}</div>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
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

            {/* Specialty Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Specialty Chart */}
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

              {/* Specialty Details */}
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
                          <p className="text-sm text-muted-foreground">
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
            </div>
          </TabsContent>

          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <CardTitle>Question-by-Question Review</CardTitle>
                <p className="text-sm text-muted-foreground">Click on any question to view details</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {questionDetails.map((q, index) => (
                    <div
                      key={q.questionId}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${
                        selectedQuestion === q.questionId ? "bg-muted" : ""
                      }`}
                      onClick={() => setSelectedQuestion(selectedQuestion === q.questionId ? null : q.questionId)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-grow min-w-0">
                          <span className="font-semibold">Q{index + 1}</span>
                          {q.isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          {q.isFlagged && <Flag className="h-5 w-5 text-yellow-500" />}
                          <p className="truncate text-sm">{q.questionText}</p>
                        </div>
                        <div className="flex-shrink-0 ml-auto">
                          <Badge variant="secondary" className="whitespace-nowrap">{q.specialty}</Badge>
                        </div>
                      </div>

                      {selectedQuestion === q.questionId && (
                        <div className="mt-4 p-4 bg-background rounded-md border">
                          <div className="space-y-4">
                            {/* Full Question Text */}
                            <div>
                              <h4 className="font-medium text-sm mb-2">Question:</h4>
                              <p className="text-sm text-muted-foreground">{q.questionText}</p>
                            </div>
                            
                            {/* Answer Choices */}
                            {q.choices && q.choices.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-2">Answer Choices:</h4>
                                <div className="space-y-2">
                                  {q.choices.map((choice) => (
                                    <div 
                                      key={choice.letter} 
                                      className={`p-2 rounded text-sm border ${
                                        choice.letter === q.correctAnswer 
                                          ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800' 
                                          : choice.letter === q.userAnswer 
                                            ? 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800' 
                                            : 'bg-background border-border'
                                      }`}
                                    >
                                      <span className="font-medium">{choice.letter}. </span>
                                      <span>{choice.text}</span>
                                      {choice.letter === q.correctAnswer && (
                                        <span className="ml-2 text-green-600 dark:text-green-400 font-medium">(Correct)</span>
                                      )}
                                      {choice.letter === q.userAnswer && choice.letter !== q.correctAnswer && (
                                        <span className="ml-2 text-red-600 dark:text-red-400 font-medium">(Your Answer)</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Answer Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border-t pt-4">
                              <div>
                                <span className="font-medium">Your Answer: </span>
                                <span className={q.userAnswer ? "" : "text-muted-foreground"}>
                                  {q.userAnswerText ? `${q.userAnswer}. ${q.userAnswerText}` : "Not Answered"}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">Correct Answer: </span>
                                <span className="text-green-600 dark:text-green-400">
                                  {q.correctAnswerText ? `${q.correctAnswer}. ${q.correctAnswerText}` : q.correctAnswer}
                                </span>
                              </div>
                            </div>

                            {/* Explanation */}
                            {q.explanation && (
                              <div className="border-t pt-4">
                                <h4 className="font-medium text-sm mb-2">Explanation:</h4>
                                <p className="text-sm text-muted-foreground">{q.explanation}</p>
                              </div>
                            )}

                            {/* Sources */}
                            {q.sources && (
                              <div className="border-t pt-4">
                                <h4 className="font-medium text-sm mb-2">Sources:</h4>
                                <SourcesDisplay sources={q.sources} />
                              </div>
                            )}
                          </div>
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
          <Button variant="outline" asChild>
            <Link href={`/test/${results.session.id}`}>
              <Repeat className="mr-2 h-4 w-4" />
              Retake Test
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
