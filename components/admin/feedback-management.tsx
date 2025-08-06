"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Calendar,
  User,
  FileText,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { QuestionFeedback, FeedbackType } from "@/lib/types"

interface FeedbackWithDetails extends QuestionFeedback {
  user_email: string
  user_full_name: string
  question_text: string
  session_name?: string
}

const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  ANSWER_CORRECTION: 'Answer Correction',
  FAULTY_QUESTION: 'Faulty Question',
  INCORRECT_EXPLANATION: 'Incorrect Explanation',
  INCOMPLETE_INFO: 'Incomplete Information',
  TYPO_ERROR: 'Typo/Grammar',
  IMAGE_ISSUE: 'Image Issue',
  SOURCE_ISSUE: 'Source Problem',
}

const FEEDBACK_TYPE_COLORS: Record<FeedbackType, string> = {
  ANSWER_CORRECTION: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  FAULTY_QUESTION: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  INCORRECT_EXPLANATION: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  INCOMPLETE_INFO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  TYPO_ERROR: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  IMAGE_ISSUE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  SOURCE_ISSUE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export function FeedbackManagement() {
  const [feedbacks, setFeedbacks] = useState<FeedbackWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<FeedbackType | "all">("all")
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackWithDetails | null>(null)

  const supabase = createClient()

  const fetchFeedbacks = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('question_feedbacks')
        .select(`
          *,
          profiles!user_id (
            email,
            full_name
          ),
          questions!question_id (
            question_text
          ),
          user_sessions!session_id (
            session_name
          )
        `)
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      const formattedData: FeedbackWithDetails[] = data?.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        question_id: item.question_id,
        session_id: item.session_id,
        feedback_type: item.feedback_type,
        suggested_correct_answer: item.suggested_correct_answer,
        created_at: item.created_at,
        user_email: item.profiles?.email || 'Unknown',
        user_full_name: item.profiles?.full_name || 'Unknown User',
        question_text: item.questions?.question_text || 'Question not found',
        session_name: item.user_sessions?.session_name,
      })) || []

      setFeedbacks(formattedData)
    } catch (err: any) {
      console.error('Error fetching feedbacks:', err)
      setError(err.message || 'Failed to fetch feedbacks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedbacks()
  }, [])

  const filteredFeedbacks = feedbacks.filter((feedback) => {
    const matchesSearch = 
      feedback.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.user_full_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = selectedType === "all" || feedback.feedback_type === selectedType

    return matchesSearch && matchesType
  })

  const feedbackStats = feedbacks.reduce((acc, feedback) => {
    acc[feedback.feedback_type] = (acc[feedback.feedback_type] || 0) + 1
    return acc
  }, {} as Record<FeedbackType, number>)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading feedback...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Question Feedback Management</h1>
          <p className="text-muted-foreground">
            Review and manage user feedback on questions
          </p>
        </div>
        <Button onClick={fetchFeedbacks} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{feedbacks.length}</div>
            <p className="text-xs text-muted-foreground">Total Feedback</p>
          </CardContent>
        </Card>
        {Object.entries(FEEDBACK_TYPE_LABELS).map(([type, label]) => (
          <Card key={type}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {feedbackStats[type as FeedbackType] || 0}
              </div>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by question, user email, or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as FeedbackType | "all")}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(FEEDBACK_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Feedback Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Feedback Submissions ({filteredFeedbacks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFeedbacks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No feedback found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Suggested Answer</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedbacks.map((feedback) => (
                    <TableRow 
                      key={feedback.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedFeedback(feedback)}
                    >
                      <TableCell>
                        <Badge className={FEEDBACK_TYPE_COLORS[feedback.feedback_type]}>
                          {FEEDBACK_TYPE_LABELS[feedback.feedback_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px] truncate">
                          {feedback.question_text}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{feedback.user_full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {feedback.user_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {feedback.suggested_correct_answer ? (
                          <Badge variant="outline" className="font-mono">
                            {feedback.suggested_correct_answer}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {feedback.session_name ? (
                          <span className="text-sm">{feedback.session_name}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(feedback.created_at)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Details Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Feedback Details
              </CardTitle>
              <CardDescription>
                Submitted by {selectedFeedback.user_full_name} on {formatDate(selectedFeedback.created_at)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Feedback Type</h4>
                <Badge className={FEEDBACK_TYPE_COLORS[selectedFeedback.feedback_type]}>
                  {FEEDBACK_TYPE_LABELS[selectedFeedback.feedback_type]}
                </Badge>
              </div>

              {selectedFeedback.suggested_correct_answer && (
                <div>
                  <h4 className="font-medium mb-2">Suggested Correct Answer</h4>
                  <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                    {selectedFeedback.suggested_correct_answer}
                  </Badge>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Question</h4>
                <p className="text-sm bg-muted p-3 rounded-lg">
                  {selectedFeedback.question_text}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">User</h4>
                  <div className="text-sm">
                    <p className="font-medium">{selectedFeedback.user_full_name}</p>
                    <p className="text-muted-foreground">{selectedFeedback.user_email}</p>
                  </div>
                </div>
                {selectedFeedback.session_name && (
                  <div>
                    <h4 className="font-medium mb-2">Session</h4>
                    <p className="text-sm">{selectedFeedback.session_name}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setSelectedFeedback(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}