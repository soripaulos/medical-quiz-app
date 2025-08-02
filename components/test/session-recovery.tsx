"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, RefreshCw, Play } from "lucide-react"

interface SessionRecoveryProps {
  onRecover?: () => void
  onDismiss?: () => void
}

export function SessionRecovery({ onRecover, onDismiss }: SessionRecoveryProps) {
  const [recoveryData, setRecoveryData] = useState<any>(null)
  const [isRecovering, setIsRecovering] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check for recoverable session data
    const checkRecoveryData = () => {
      const activeSession = localStorage.getItem('activeTestSession')
      if (activeSession) {
        try {
          const sessionData = JSON.parse(activeSession)
          const timeSinceLastActivity = Date.now() - sessionData.lastActivity
          
          // Only show recovery if session was active recently (within 2 hours)
          if (timeSinceLastActivity < 2 * 60 * 60 * 1000) {
            setRecoveryData(sessionData)
          } else {
            // Clean up old session data
            localStorage.removeItem('activeTestSession')
            localStorage.removeItem(`session_${sessionData.sessionId}_backup`)
          }
        } catch (error) {
          console.error('Error parsing recovery data:', error)
          localStorage.removeItem('activeTestSession')
        }
      }
    }

    checkRecoveryData()
  }, [])

  const handleRecover = async () => {
    if (!recoveryData) return

    setIsRecovering(true)
    
    try {
      // Try to resume the session
      const response = await fetch(`/api/sessions/${recoveryData.sessionId}/resume`, {
        method: "POST",
      })

      if (response.ok) {
        // Navigate back to the session
        router.push(`/test/${recoveryData.sessionId}`)
        onRecover?.()
      } else {
        throw new Error('Failed to resume session')
      }
    } catch (error) {
      console.error('Error recovering session:', error)
      // Still try to navigate to the session
      router.push(`/test/${recoveryData.sessionId}`)
      onRecover?.()
    } finally {
      setIsRecovering(false)
    }
  }

  const handleStartNew = () => {
    // Clean up the old session data
    localStorage.removeItem('activeTestSession')
    if (recoveryData?.sessionId) {
      localStorage.removeItem(`session_${recoveryData.sessionId}_backup`)
    }
    setRecoveryData(null)
    onDismiss?.()
  }

  if (!recoveryData) return null

  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
          <AlertCircle className="w-5 h-5" />
          Resume Test Session?
        </CardTitle>
        <CardDescription className="text-blue-700 dark:text-blue-300">
          We found a paused test session that you can continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p><strong>Session:</strong> {recoveryData.sessionName}</p>
            <p><strong>Last Activity:</strong> {new Date(recoveryData.lastActivity).toLocaleString()}</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleRecover} 
              disabled={isRecovering}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              {isRecovering ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isRecovering ? 'Resuming...' : 'Resume Session'}
            </Button>
            
            <Button 
              onClick={handleStartNew} 
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