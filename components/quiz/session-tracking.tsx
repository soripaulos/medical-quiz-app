"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Clock, Target, CheckCircle2, XCircle, Brain } from 'lucide-react'
import type { UserSession, UserAnswer } from '@/lib/types'

interface SessionTrackingProps {
  session: UserSession
  userAnswers: UserAnswer[]
  totalQuestions: number
}

export function SessionTracking({ session, userAnswers, totalQuestions }: SessionTrackingProps) {
  // Calculate progress
  const answeredCount = userAnswers.length
  const progressPercentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0

  // Calculate performance
  const correctAnswers = userAnswers.filter(answer => answer.is_correct).length
  const incorrectAnswers = userAnswers.filter(answer => !answer.is_correct).length

  // Calculate time spent dynamically
  const [timeSpent, setTimeSpent] = React.useState(0)

  React.useEffect(() => {
    if (session.created_at) {
      const startTime = new Date(session.created_at).getTime()
      const updateTime = () => {
        const now = Date.now()
        const elapsed = Math.floor((now - startTime) / 1000) // Convert to seconds
        setTimeSpent(elapsed)
      }
      
      // Update immediately
      updateTime()
      
      // Update every minute
      const interval = setInterval(updateTime, 60000)
      
      return () => clearInterval(interval)
    }
  }, [session.created_at])

  const formatTimeSpent = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4 text-blue-600" />
          Session Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {answeredCount} of {totalQuestions}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">{progressPercentage}% completed</p>
        </div>

        {/* Time and Performance Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Time Spent */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Time Spent</span>
            </div>
            <p className="text-sm font-bold text-foreground">
              {formatTimeSpent(timeSpent)}
            </p>
          </div>

          {/* Performance */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground">Performance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span className="text-xs font-bold text-green-600">{correctAnswers}</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-500" />
                <span className="text-xs font-bold text-red-600">{incorrectAnswers}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Session Type Badge */}
        <div className="pt-2 border-t border-border">
          <Badge 
            variant="outline" 
            className={`text-xs ${
              session.session_type === 'exam' 
                ? 'text-red-600 border-red-600' 
                : 'text-blue-600 border-blue-600'
            }`}
          >
            {session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1)} Mode
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
} 