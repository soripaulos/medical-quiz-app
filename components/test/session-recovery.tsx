"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Play, Clock, BookOpen, AlertCircle, Target, CheckCircle2, Brain } from "lucide-react"

interface SessionData {
  sessionId: string
  sessionName: string
  sessionType: string
  currentQuestionIndex: number
  totalQuestions: number
  timeRemaining?: number
  activeTimeSeconds?: number
  lastActivity: number
  isActive: boolean
  isPaused: boolean
  completedAt?: string
  correctAnswers?: number
  incorrectAnswers?: number
}

interface UnifiedSessionManagerProps {
  onRecover?: () => void
  onDismiss?: () => void
}

export function UnifiedSessionManager({ onRecover, onDismiss }: UnifiedSessionManagerProps) {
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRecovering, setIsRecovering] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkForActiveSession()
  }, [])

  const checkForActiveSession = async () => {
    try {
      // First check localStorage for recent session
      const localSession = checkLocalStorageSession()
      
      // Then check database for active session
      const dbSession = await checkDatabaseSession()
      
      // Use the most recent session or merge data
      const activeSession = selectActiveSession(localSession, dbSession)
      
      // Don't show sessions that have ended
      if (activeSession && !activeSession.completedAt && activeSession.isActive) {
        setSessionData(activeSession)
      }
    } catch (error) {
      console.error('Error checking for active session:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkLocalStorageSession = (): SessionData | null => {
    try {
      const storedSession = localStorage.getItem('activeTestSession')
      if (!storedSession) return null

      const sessionData = JSON.parse(storedSession)
      const timeSinceLastActivity = Date.now() - sessionData.lastActivity
      
      // Only consider sessions active within the last 2 hours
      if (timeSinceLastActivity > 2 * 60 * 60 * 1000) {
        localStorage.removeItem('activeTestSession')
        return null
      }

      return {
        sessionId: sessionData.sessionId,
        sessionName: sessionData.sessionName,
        sessionType: sessionData.sessionType,
        currentQuestionIndex: sessionData.currentQuestionIndex || 0,
        totalQuestions: sessionData.totalQuestions || 0,
        timeRemaining: sessionData.timeRemaining,
        activeTimeSeconds: sessionData.activeTimeSeconds,
        lastActivity: sessionData.lastActivity,
        isActive: sessionData.isActive,
        isPaused: true, // localStorage sessions are always considered paused
      }
    } catch (error) {
      console.error('Error parsing localStorage session:', error)
      localStorage.removeItem('activeTestSession')
      return null
    }
  }

  const checkDatabaseSession = async (): Promise<SessionData | null> => {
    try {
      const response = await fetch('/api/user/active-session')
      if (!response.ok) return null

      const data = await response.json()
      if (!data.activeSession) return null

      const session = data.activeSession
      
      // Don't return completed sessions
      if (session.completed_at) return null

      return {
        sessionId: session.id,
        sessionName: session.session_name,
        sessionType: session.session_type,
        currentQuestionIndex: session.current_question_index || 0,
        totalQuestions: session.total_questions || 0,
        timeRemaining: session.time_remaining,
        activeTimeSeconds: session.active_time_seconds,
        lastActivity: Date.now(),
        isActive: session.is_active,
        isPaused: session.is_paused,
        completedAt: session.completed_at,
        correctAnswers: session.correct_answers,
        incorrectAnswers: session.incorrect_answers,
      }
    } catch (error) {
      console.error('Error fetching database session:', error)
      return null
    }
  }

  const selectActiveSession = (localSession: SessionData | null, dbSession: SessionData | null): SessionData | null => {
    // If no sessions, return null
    if (!localSession && !dbSession) return null
    
    // If only one session exists, return it
    if (!localSession) return dbSession
    if (!dbSession) return localSession
    
    // If both exist, prefer the one with more recent activity
    if (localSession.lastActivity > (dbSession.lastActivity || 0)) {
      return localSession
    }
    
    return dbSession
  }

  const handleResumeSession = async () => {
    if (!sessionData) return

    setIsRecovering(true)
    
    try {
      // Try to resume the session to ensure timer continuity
      const response = await fetch(`/api/sessions/${sessionData.sessionId}/resume`, {
        method: "POST",
      })

      if (response.ok) {
        // Clean up localStorage since we're resuming
        localStorage.removeItem('activeTestSession')
        
        // Navigate to session
        router.push(`/test/${sessionData.sessionId}`)
        onRecover?.()
      } else {
        throw new Error('Failed to resume session')
      }
    } catch (error) {
      console.error('Error resuming session:', error)
      // Still try to navigate to the session
      router.push(`/test/${sessionData.sessionId}`)
      onRecover?.()
    } finally {
      setIsRecovering(false)
    }
  }

  const handleStartNewTest = () => {
    // Clean up all session data
    localStorage.removeItem('activeTestSession')
    
    setSessionData(null)
    onDismiss?.()
  }

  const formatTime = (seconds?: number) => {
    if (!seconds) return "0:00"
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = () => {
    if (!sessionData || !sessionData.totalQuestions) return 0
    return Math.round((sessionData.currentQuestionIndex / sessionData.totalQuestions) * 100)
  }

  if (loading) {
    return (
      <Card className="w-full animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!sessionData) return null

  const progressPercentage = getProgressPercentage()
  const isExamMode = sessionData.sessionType === 'exam'

  return (
    <Card className="w-full border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-950/20 dark:via-background dark:to-indigo-950/20 dark:bg-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
              <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="truncate">Continue Your Test</span>
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium truncate">{sessionData.sessionName}</p>
          </div>
          <Badge className={`${isExamMode ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'} font-semibold px-2 py-1 text-xs flex-shrink-0`}>
            {sessionData.sessionType.charAt(0).toUpperCase() + sessionData.sessionType.slice(1)} Mode
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span className="text-gray-600 dark:text-gray-400">
              {sessionData.currentQuestionIndex} of {sessionData.totalQuestions}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Stats Row - Responsive Layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Performance Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Performance</span>
            </div>
            {!isExamMode && (sessionData.correctAnswers !== undefined || sessionData.incorrectAnswers !== undefined) ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">{sessionData.correctAnswers || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">{sessionData.incorrectAnswers || 0}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-base font-bold text-gray-600 dark:text-gray-400">{sessionData.currentQuestionIndex}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">answered</span>
              </div>
            )}
          </div>

          {/* Time Display */}
          {(sessionData.timeRemaining || sessionData.activeTimeSeconds) && (
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className="font-mono">
                {isExamMode ? formatTime(sessionData.timeRemaining) : formatTime(sessionData.activeTimeSeconds)}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons - Responsive Layout */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button 
            onClick={handleResumeSession} 
            disabled={isRecovering}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold flex-1 sm:flex-none"
          >
            {isRecovering ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRecovering ? 'Resuming...' : 'Resume Test'}
          </Button>
          
          <Button 
            onClick={handleStartNewTest} 
            variant="outline"
            className="flex-1 sm:flex-none"
          >
            New Test
          </Button>
        </div>

        {/* Status Footer */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">{progressPercentage}% completed</span>
            <div>
              {sessionData.isPaused ? (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600 dark:text-yellow-400 dark:border-yellow-400 text-xs">Paused</Badge>
              ) : (
                <Badge variant="outline" className="text-green-600 border-green-600 dark:text-green-400 dark:border-green-400 text-xs">Active</Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Export with original name for backward compatibility
export { UnifiedSessionManager as SessionRecovery }