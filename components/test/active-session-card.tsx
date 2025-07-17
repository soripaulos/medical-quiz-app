"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Play, 
  Clock, 
  BookOpen, 
  Target, 
  Calendar,
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

  const formatTimeRemaining = (timeRemaining: number) => {
    const hours = Math.floor(timeRemaining / 3600)
    const minutes = Math.floor((timeRemaining % 3600) / 60)
    const seconds = timeRemaining % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
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

  const getTimeStatus = () => {
    if (!activeSession?.time_remaining || !activeSession?.time_limit) return null
    
    const percentage = (activeSession.time_remaining / (activeSession.time_limit * 60)) * 100
    
    if (percentage <= 10) return 'critical'
    if (percentage <= 25) return 'warning'
    return 'normal'
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

  const timeStatus = getTimeStatus()
  const progressPercentage = getProgressPercentage()
  const isExamMode = activeSession.session_type === 'exam'

  return (
    <Card className="w-full border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-950/20 dark:via-background dark:to-indigo-950/20 dark:bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Continue Your Test</span>
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{activeSession.session_name}</p>
          </div>
          <Badge className={`${getSessionTypeColor(activeSession.session_type)} font-semibold px-2 py-1 text-xs`}>
            {activeSession.session_type.charAt(0).toUpperCase() + activeSession.session_type.slice(1)} Mode
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {activeSession.current_question_index} of {activeSession.total_questions} questions
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400">{progressPercentage}% completed</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Time Display */}
          <div className="space-y-1">
            {isExamMode ? (
              <>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Remaining</span>
                </div>
                <p className={`text-base font-bold ${
                  timeStatus === 'critical' ? 'text-red-600 dark:text-red-400' : 
                  timeStatus === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {formatTimeRemaining(activeSession.time_remaining || 0)}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Practice Mode</span>
                </div>
                <p className="text-base font-bold text-gray-600 dark:text-gray-400">
                  No time limit
                </p>
              </>
            )}
          </div>

          {/* Performance - Only show for practice mode */}
          {!isExamMode && (
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Performance</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">{sessionMetrics.correctAnswers}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">{sessionMetrics.incorrectAnswers}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* For exam mode, show a placeholder or different stat */}
          {isExamMode && (
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Answered</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-base font-bold text-gray-600 dark:text-gray-400">{sessionMetrics.totalAnswered}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">questions</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Link href={`/test/${activeSession.id}`} className="block">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition-all duration-200">
            <Play className="h-4 w-4 mr-2" />
            Resume Test Session
          </Button>
        </Link>

        {/* Quick Stats */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Started: {new Date(activeSession.created_at).toLocaleDateString()}</span>
            <span>
              {activeSession.is_paused ? (
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