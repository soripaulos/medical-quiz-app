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
      
      // Then check database for active session (with timeout)
      const dbSession = await Promise.race([
        checkDatabaseSession(),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Database check timeout')), 5000)
        )
      ]).catch((error) => {
        console.warn('Database session check failed:', error)
        return null
      })
      
      // Use the most recent session or merge data
      const activeSession = selectActiveSession(localSession, dbSession)
      
      // Don't show sessions that have ended or are invalid
      if (activeSession && !activeSession.completedAt && activeSession.isActive && activeSession.sessionId) {
        setSessionData(activeSession)
      }
    } catch (error) {
      console.error('Error checking for active session:', error)
      // If there's an error, still try to use localStorage session
      try {
        const localSession = checkLocalStorageSession()
        if (localSession && !localSession.completedAt && localSession.isActive && localSession.sessionId) {
          setSessionData(localSession)
        }
      } catch (localError) {
        console.error('Error with localStorage session:', localError)
      }
    } finally {
      setLoading(false)
    }
  }

  const checkLocalStorageSession = (): SessionData | null => {
    try {
      const storedSession = localStorage.getItem('activeTestSession')
      if (!storedSession) return null

      const sessionData = JSON.parse(storedSession)
      
      // Validate required fields
      if (!sessionData.sessionId || !sessionData.sessionName || !sessionData.lastActivity) {
        localStorage.removeItem('activeTestSession')
        return null
      }
      
      const timeSinceLastActivity = Date.now() - sessionData.lastActivity
      
      // Only consider sessions active within the last 2 hours
      if (timeSinceLastActivity > 2 * 60 * 60 * 1000) {
        localStorage.removeItem('activeTestSession')
        return null
      }

      return {
        sessionId: sessionData.sessionId,
        sessionName: sessionData.sessionName,
        sessionType: sessionData.sessionType || 'practice',
        currentQuestionIndex: Math.max(0, sessionData.currentQuestionIndex || 0),
        totalQuestions: Math.max(0, sessionData.totalQuestions || 0),
        timeRemaining: sessionData.timeRemaining,
        activeTimeSeconds: sessionData.activeTimeSeconds,
        lastActivity: sessionData.lastActivity,
        isActive: Boolean(sessionData.isActive),
        isPaused: true, // localStorage sessions are always considered paused
      }
    } catch (error) {
      console.error('Error parsing localStorage session:', error)
      // Clean up corrupted localStorage data
      try {
        localStorage.removeItem('activeTestSession')
      } catch (cleanupError) {
        console.error('Error cleaning up localStorage:', cleanupError)
      }
      return null
    }
  }

  const checkDatabaseSession = async (): Promise<SessionData | null> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      const response = await fetch('/api/user/active-session', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.warn(`Database session check failed: ${response.status}`)
        return null
      }

      const data = await response.json()
      if (!data || !data.activeSession) return null

      const session = data.activeSession
      
      // Validate session data
      if (!session.id || !session.session_name || session.completed_at) {
        return null
      }

      return {
        sessionId: session.id,
        sessionName: session.session_name,
        sessionType: session.session_type || 'practice',
        currentQuestionIndex: Math.max(0, session.current_question_index || 0),
        totalQuestions: Math.max(0, session.total_questions || 0),
        timeRemaining: session.time_remaining,
        activeTimeSeconds: session.total_active_time,
        lastActivity: Date.now(),
        isActive: Boolean(session.is_active),
        isPaused: Boolean(session.is_paused),
        completedAt: session.completed_at,
        correctAnswers: session.correct_answers,
        incorrectAnswers: session.incorrect_answers,
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Database session check timed out')
      } else {
        console.error('Error fetching database session:', error)
      }
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
    if (!sessionData || !sessionData.sessionId) return

    setIsRecovering(true)
    
    try {
      // Try to resume the session to ensure timer continuity (with timeout)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`/api/sessions/${sessionData.sessionId}/resume`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      clearTimeout(timeoutId)

      if (response.ok) {
        // Clean up localStorage since we're resuming
        try {
          localStorage.removeItem('activeTestSession')
        } catch (cleanupError) {
          console.warn('Error cleaning up localStorage:', cleanupError)
        }
        
        // Navigate to session
        router.push(`/test/${sessionData.sessionId}`)
        onRecover?.()
      } else {
        console.warn(`Resume session failed: ${response.status}`)
        // Still try to navigate to the session
        router.push(`/test/${sessionData.sessionId}`)
        onRecover?.()
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Resume session timed out, proceeding anyway')
      } else {
        console.error('Error resuming session:', error)
      }
      // Still try to navigate to the session - the session page will handle recovery
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
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Continue Your Test</span>
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{sessionData.sessionName}</p>
          </div>
          <Badge className={`${isExamMode ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'} font-semibold px-2 py-1 text-xs`}>
            {sessionData.sessionType.charAt(0).toUpperCase() + sessionData.sessionType.slice(1)} Mode
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {sessionData.currentQuestionIndex} of {sessionData.totalQuestions} questions
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Stats and Action Row */}
        <div className="flex items-center justify-between">
          {/* Performance Stats */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Performance</span>
            </div>
            {!isExamMode && (sessionData.correctAnswers !== undefined || sessionData.incorrectAnswers !== undefined) ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">{sessionData.correctAnswers || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">{sessionData.incorrectAnswers || 0}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <span className="text-base font-bold text-gray-600 dark:text-gray-400">{sessionData.currentQuestionIndex}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">answered</span>
              </div>
            )}
          </div>

          {/* Time and Action */}
          <div className="flex items-center space-x-3">
            {(sessionData.timeRemaining || sessionData.activeTimeSeconds) && (
              <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>
                  {isExamMode ? formatTime(sessionData.timeRemaining) : formatTime(sessionData.activeTimeSeconds)}
                </span>
              </div>
            )}
            
            <Button 
              onClick={handleResumeSession} 
              disabled={isRecovering}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold"
              size="sm"
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
              size="sm"
            >
              New Test
            </Button>
          </div>
        </div>

        {/* Status Footer */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{progressPercentage}% completed</span>
            <span>
              {sessionData.isPaused ? (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600 dark:text-yellow-400 dark:border-yellow-400">Paused</Badge>
              ) : (
                <Badge variant="outline" className="text-green-600 border-green-600 dark:text-green-400 dark:border-green-400">Active</Badge>
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Export with original name for backward compatibility
export { UnifiedSessionManager as SessionRecovery }