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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeSpent, setTimeSpent] = useState(0)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeUpdateRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchActiveSession()
    
    // Start polling for real-time updates
    pollIntervalRef.current = setInterval(fetchActiveSession, 5000) // Poll every 5 seconds

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current)
      }
    }
  }, [])

  // Update time spent counter for active sessions
  useEffect(() => {
    if (activeSession && !activeSession.is_paused) {
      const startTime = new Date(activeSession.created_at).getTime()
      const updateTime = () => {
        const now = Date.now()
        const elapsed = Math.floor((now - startTime) / 1000)
        setTimeSpent(elapsed)
      }
      
      updateTime() // Initial update
      timeUpdateRef.current = setInterval(updateTime, 1000) // Update every second
    } else if (timeUpdateRef.current) {
      clearInterval(timeUpdateRef.current)
      timeUpdateRef.current = null
    }

    return () => {
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current)
      }
    }
  }, [activeSession, activeSession?.is_paused])

  const fetchActiveSession = async () => {
    try {
      setError(null)
      const response = await fetch('/api/user/active-session')
      
      if (response.ok) {
        const data = await response.json()
        setActiveSession(data.activeSession)
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

  const formatTimeRemaining = (timeRemaining: number) => {
    const hours = Math.floor(timeRemaining / 3600)
    const minutes = Math.floor((timeRemaining % 3600) / 60)
    const seconds = timeRemaining % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatTimeSpent = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getSessionTypeColor = (type: string) => {
    return type === 'exam' 
      ? 'bg-red-100 text-red-800 border-red-200' 
      : 'bg-blue-100 text-blue-800 border-blue-200'
  }

  const getProgressPercentage = () => {
    if (!activeSession) return 0
    return Math.round((activeSession.current_question_index / activeSession.total_questions) * 100)
  }

  const getTimeStatus = () => {
    if (!activeSession?.time_remaining) return null
    
    const percentage = (activeSession.time_remaining / (activeSession.time_limit! * 60)) * 100
    
    if (percentage <= 10) return 'critical'
    if (percentage <= 25) return 'warning'
    return 'normal'
  }

  if (loading) {
    return (
      <Card className="w-full animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-5 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            <div className="h-2 bg-gray-200 rounded w-full"></div>
            <div className="h-8 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs">{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!activeSession) {
    return (
      <Card className="w-full border-dashed border-gray-300">
        <CardContent className="pt-4">
          <div className="text-center text-gray-500">
            <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-xs">No active test session</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const timeStatus = getTimeStatus()
  const progressPercentage = getProgressPercentage()

  return (
    <Card className="w-full border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <span>Continue Your Test</span>
            </CardTitle>
            <p className="text-sm text-gray-600 font-medium">{activeSession.session_name}</p>
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
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-600">
              {activeSession.current_question_index} of {activeSession.total_questions} questions
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-gray-500">{progressPercentage}% completed</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Time Information */}
          <div className="space-y-1">
            {activeSession.time_remaining ? (
              <>
                <div className="flex items-center space-x-2">
                  <Clock className={`h-4 w-4 ${
                    timeStatus === 'critical' ? 'text-red-500' :
                    timeStatus === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                  }`} />
                  <span className="text-sm font-medium text-gray-700">Time Left</span>
                </div>
                <p className={`text-base font-bold ${
                  timeStatus === 'critical' ? 'text-red-600' :
                  timeStatus === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                }`}>
                  {formatTimeRemaining(activeSession.time_remaining)}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Time Spent</span>
                </div>
                <p className="text-base font-bold text-gray-600">
                  {formatTimeSpent(timeSpent)}
                </p>
              </>
            )}
          </div>

          {/* Performance */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700">Performance</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-bold text-green-600">{activeSession.correct_answers || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-bold text-red-600">{activeSession.incorrect_answers || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Link href={`/test/${activeSession.id}`} className="block">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-all duration-200">
            <Play className="h-4 w-4 mr-2" />
            Resume Test Session
          </Button>
        </Link>

        {/* Quick Stats */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Started: {new Date(activeSession.created_at).toLocaleDateString()}</span>
            <span>
              {activeSession.is_paused ? (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">Paused</Badge>
              ) : (
                <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 