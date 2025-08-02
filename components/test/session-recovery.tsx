"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Play, Clock, BookOpen, AlertCircle } from "lucide-react"

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
  correctAnswers?: number
  incorrectAnswers?: number
}

interface UnifiedSessionManagerProps {
  compact?: boolean
  onRecover?: () => void
  onDismiss?: () => void
}

export function UnifiedSessionManager({ compact = false, onRecover, onDismiss }: UnifiedSessionManagerProps) {
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
      
      setSessionData(activeSession)
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
        localStorage.removeItem(`session_${sessionData.sessionId}_backup`)
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
        localStorage.removeItem(`session_${sessionData.sessionId}_backup`)
        
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
    if (sessionData?.sessionId) {
      localStorage.removeItem(`session_${sessionData.sessionId}_backup`)
    }
    
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
    return compact ? (
      <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
    ) : (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </CardContent>
      </Card>
    )
  }

  if (!sessionData) return null

  const progressPercentage = getProgressPercentage()
  const isExamMode = sessionData.sessionType === 'exam'

  if (compact) {
    return (
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 dark:border-blue-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                  Continue Test
                </h3>
                <Badge className="text-xs px-1 py-0 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {sessionData.sessionType}
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <span>{sessionData.currentQuestionIndex}/{sessionData.totalQuestions}</span>
                </div>
                {(sessionData.timeRemaining || sessionData.activeTimeSeconds) && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>
                      {isExamMode ? formatTime(sessionData.timeRemaining) : formatTime(sessionData.activeTimeSeconds)}
                    </span>
                  </div>
                )}
              </div>
              
              <Progress value={progressPercentage} className="h-1.5" />
            </div>
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleResumeSession} 
                disabled={isRecovering}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 h-8"
              >
                {isRecovering ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleStartNewTest}
                className="px-2 py-1 h-8 text-xs"
              >
                New
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-blue-800 dark:text-blue-200">Resume Test Session?</h3>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Continue your {sessionData.isPaused ? 'paused' : 'active'} test session.
              </p>
            </div>
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {sessionData.sessionType}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-blue-700 dark:text-blue-300">Progress</span>
              <span className="text-blue-600 dark:text-blue-400">
                {sessionData.currentQuestionIndex}/{sessionData.totalQuestions}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleResumeSession} 
              disabled={isRecovering}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              {isRecovering ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isRecovering ? 'Resuming...' : 'Resume Session'}
            </Button>
            
            <Button 
              onClick={handleStartNewTest} 
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900"
            >
              Start New Test
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Export with original name for backward compatibility
export { UnifiedSessionManager as SessionRecovery }