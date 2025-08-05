"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Play, 
  BookOpen, 
  Target, 
  AlertCircle,
  CheckCircle2,
  Brain
} from 'lucide-react'
import Link from 'next/link'
import type { UserSession } from '@/lib/types'

interface ActiveSessionCardProps {
  compact?: boolean
}

export function ActiveSessionCard({ compact = false }: ActiveSessionCardProps) {
  const [activeSession, setActiveSession] = useState<UserSession | null>(null)
  const [sessionMetrics, setSessionMetrics] = useState({
    correctAnswers: 0,
    incorrectAnswers: 0,
    totalAnswered: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchActiveSession()
    
    // Start polling for real-time updates
    pollIntervalRef.current = setInterval(fetchActiveSession, 5000) // Poll every 5 seconds

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const fetchActiveSession = async () => {
    try {
      setError(null)
      const response = await fetch('/api/user/active-session')
      
      if (response.ok) {
        const data = await response.json()
        setActiveSession(data.activeSession)
        
        // Fetch session stats if there's an active session
        if (data.activeSession) {
          await fetchSessionStats(data.activeSession.id)
        }
      } else if (response.status !== 401) {
        throw new Error('Failed to fetch active session')
      }
    } catch (error) {
      console.error('Error fetching active session:', error)
      setError('Failed to load active session')
    } finally {
      setLoading(false)
    }
  }

  const fetchSessionStats = async (sessionId: string) => {
    try {
      // Fetch session data including answers for statistics
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        const { session, userAnswers } = data
        
        // Calculate stats from user answers
        const correctAnswers = userAnswers.filter((a: any) => a.is_correct).length
        const incorrectAnswers = userAnswers.filter((a: any) => !a.is_correct).length
        const totalAnswered = userAnswers.length
        
        setSessionMetrics({
          correctAnswers,
          incorrectAnswers,
          totalAnswered,
        })
        
        // Update session with calculated stats
        setActiveSession(prev => prev ? {
          ...prev,
          correct_answers: correctAnswers,
          incorrect_answers: incorrectAnswers,
          current_question_index: Math.max(1, totalAnswered)
        } : null)
      }
    } catch (error) {
      console.error('Error fetching session stats:', error)
    }
  }

  const getSessionTypeColor = (type: string) => {
    return type === 'exam' 
      ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' 
      : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
  }

  const getProgressPercentage = () => {
    if (!activeSession) return 0
    return Math.round((activeSession.current_question_index / activeSession.total_questions) * 100)
  }

  if (loading) {
    return (
      <Card className="w-full animate-pulse dark:bg-card">
        <CardHeader className="pb-2">
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

  if (error) {
    return (
      <Card className="w-full border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
        <CardContent className="pt-4">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs">{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!activeSession) {
    return (
      <Card className="w-full border-dashed border-gray-300 dark:border-gray-600 dark:bg-card">
        <CardContent className="pt-4">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
            <p className="text-xs">No active test session</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const progressPercentage = getProgressPercentage()
  const isExamMode = activeSession.session_type === 'exam'

  return (
    <Card className="w-full border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-950/20 dark:via-background dark:to-indigo-950/20 dark:bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <div>
              <CardTitle className="text-base font-bold text-gray-900 dark:text-gray-100">Continue Test</CardTitle>
              <p className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate max-w-[150px]">{activeSession.session_name}</p>
            </div>
          </div>
          <Badge className={`${getSessionTypeColor(activeSession.session_type)} font-semibold px-2 py-1 text-xs`}>
            {activeSession.session_type.charAt(0).toUpperCase() + activeSession.session_type.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Compact Progress Section */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {activeSession.current_question_index}/{activeSession.total_questions} ({progressPercentage}%)
            </span>
          </div>
          <Progress value={progressPercentage} className="h-1.5" />
        </div>

        {/* Compact Stats */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center space-x-2">
            <Target className="h-3 w-3 text-green-500" />
            {!isExamMode ? (
              <div className="flex items-center space-x-2">
                <span className="text-green-600 dark:text-green-400 font-medium">✓{sessionMetrics.correctAnswers}</span>
                <span className="text-red-600 dark:text-red-400 font-medium">✗{sessionMetrics.incorrectAnswers}</span>
              </div>
            ) : (
              <span className="text-gray-600 dark:text-gray-400 font-medium">{sessionMetrics.totalAnswered} answered</span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {activeSession.is_paused ? (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600 dark:text-yellow-400 dark:border-yellow-400 text-xs px-1 py-0">Paused</Badge>
            ) : (
              <Badge variant="outline" className="text-green-600 border-green-600 dark:text-green-400 dark:border-green-400 text-xs px-1 py-0">Active</Badge>
            )}
          </div>
        </div>

        {/* Compact Action Button */}
        <Link href={`/test/${activeSession.id}`} className="block">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium py-1.5 text-sm rounded-lg transition-all duration-200">
            <Play className="h-3 w-3 mr-1" />
            Resume Test
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
} 