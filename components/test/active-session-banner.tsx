"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Clock, BookOpen } from 'lucide-react'
import Link from 'next/link'
import type { UserSession } from '@/lib/types'

export function ActiveSessionBanner() {
  const [activeSession, setActiveSession] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActiveSession()
  }, [])

  const fetchActiveSession = async () => {
    try {
      const response = await fetch('/api/user/active-session')
      if (response.ok) {
        const data = await response.json()
        setActiveSession(data.activeSession)
      }
    } catch (error) {
      console.error('Error fetching active session:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-16 bg-gray-200 rounded-lg mb-4"></div>
      </div>
    )
  }

  if (!activeSession) {
    return null
  }

  const formatTimeRemaining = (timeRemaining: number) => {
    const minutes = Math.floor(timeRemaining / 60)
    const seconds = timeRemaining % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getSessionTypeColor = (type: string) => {
    return type === 'exam' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
  }

  return (
    <Card className="mb-6 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Continue Your Test</h3>
                <p className="text-sm text-gray-600">{activeSession.session_name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className={getSessionTypeColor(activeSession.session_type)}>
                {activeSession.session_type.charAt(0).toUpperCase() + activeSession.session_type.slice(1)}
              </Badge>
              
              {activeSession.time_remaining && (
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{formatTimeRemaining(activeSession.time_remaining)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {activeSession.current_question_index + 1} of {activeSession.total_questions}
            </span>
            <Link href={`/test/${activeSession.id}`}>
              <Button className="flex items-center space-x-2">
                <Play className="h-4 w-4" />
                <span>Resume</span>
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 