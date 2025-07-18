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
          
          // Only show recovery if session was active recently (within 1 hour)
          if (timeSinceLastActivity < 60 * 60 * 1000) {
            setRecoveryData(sessionData)
          } else {
            // Clean up old session data
            localStorage.removeItem('activeTestSession')
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

  const handleDismiss = () => {
    localStorage.removeItem('activeTestSession')
    setRecoveryData(null)
    onDismiss?.()
  }

  if (!recoveryData) return null

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertCircle className="w-5 h-5" />
          Session Recovery Available
        </CardTitle>
        <CardDescription className="text-orange-700">
          We found an interrupted test session that you can resume.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-orange-700">
            <p><strong>Session:</strong> {recoveryData.sessionName}</p>
            <p><strong>Last Activity:</strong> {new Date(recoveryData.lastActivity).toLocaleString()}</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleRecover} 
              disabled={isRecovering}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isRecovering ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isRecovering ? 'Resuming...' : 'Resume Session'}
            </Button>
            
            <Button 
              onClick={handleDismiss} 
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}