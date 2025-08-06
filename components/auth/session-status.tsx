"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Smartphone, AlertCircle, RefreshCw } from "lucide-react"
import { useSessionStatus } from "@/hooks/use-session-status"

export function SessionStatus() {
  const { 
    sessionCount, 
    loading, 
    error, 
    refreshSessionCount, 
    isAtLimit 
  } = useSessionStatus()
  const [message, setMessage] = useState<string | null>(null)



  const getStatusColor = () => {
    if (sessionCount === 0) return 'bg-gray-500'
    if (sessionCount === 1) return 'bg-green-500'
    if (sessionCount === 2) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusText = () => {
    if (sessionCount === 0) return 'No active sessions'
    if (sessionCount === 1) return 'Single session active'
    if (sessionCount === 2) return 'Maximum sessions reached'
    return 'Over limit (error)'
  }

  if (loading && sessionCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Active Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="ml-2 text-sm text-gray-600">Loading session status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Active Sessions
          <Badge variant="secondary" className="ml-auto">
            {sessionCount}/2
          </Badge>
        </CardTitle>
        <CardDescription>
          You can have up to 2 active sessions at the same time. If you try to sign in from a third device, you'll be blocked. To free up a session, sign out from one of your devices.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {message && (
          <Alert className={message.includes('error') || message.includes('Failed') ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <div>
              <div className="font-medium">{getStatusText()}</div>
              <div className="text-sm text-gray-500">
                {isAtLimit 
                  ? "You cannot sign in from additional devices" 
                  : `You can sign in from ${2 - sessionCount} more device${2 - sessionCount !== 1 ? 's' : ''}`
                }
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshSessionCount}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <strong>How it works:</strong>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• Each time you sign in, your session count increases</li>
            <li>• When you sign out, your session count decreases</li>
            <li>• If you reach 2 sessions, new sign-ins will be blocked</li>
            <li>• To free up a session slot, sign out from one of your devices</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

// Compact version for showing in headers or status bars
export function SessionStatusBadge() {
  const { sessionCount, isAtLimit } = useSessionStatus()

  if (sessionCount === 0) return null

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${
        sessionCount === 1 
          ? 'bg-green-500' 
          : sessionCount === 2 
          ? 'bg-yellow-500' 
          : 'bg-red-500'
      }`} />
      <span className={isAtLimit ? 'text-yellow-600 font-medium' : 'text-gray-600'}>
        {sessionCount}/2 sessions
      </span>
    </div>
  )
}