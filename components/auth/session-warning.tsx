"use client"

import { useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, LogOut } from "lucide-react"
import { useSessionLimit } from "@/hooks/use-session-limit"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

export function SessionWarning() {
  const { 
    isSessionValid, 
    sessionWarning, 
    activeSessionCount,
    endAllOtherSessions 
  } = useSessionLimit()
  const { signOut } = useAuth()
  const router = useRouter()

  // Handle invalid session by signing out
  useEffect(() => {
    if (!isSessionValid) {
      const timer = setTimeout(() => {
        signOut()
      }, 5000) // Give user 5 seconds to see the warning

      return () => clearTimeout(timer)
    }
  }, [isSessionValid, signOut])

  // Don't render anything if session is valid and no warning
  if (isSessionValid && !sessionWarning) {
    return null
  }

  // Handle session expired or ended from another device
  if (!isSessionValid) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-red-50 border-b border-red-200">
        <Alert variant="destructive" className="max-w-4xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {sessionWarning || "Your session is no longer valid. You will be signed out shortly."}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => signOut()}
              className="ml-4"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Sign Out Now
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Handle session limit warnings
  if (sessionWarning) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-yellow-50 border-b border-yellow-200">
        <Alert className="max-w-4xl mx-auto border-yellow-300">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="text-yellow-800">{sessionWarning}</p>
              <p className="text-sm text-yellow-600 mt-1">
                Active sessions: {activeSessionCount}/2
              </p>
            </div>
            {activeSessionCount > 1 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={endAllOtherSessions}
                className="ml-4 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                End Other Sessions
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return null
}

// Simple session status indicator for the UI
export function SessionStatus() {
  const { activeSessionCount } = useSessionLimit()

  if (activeSessionCount === 0) return null

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <div className="flex items-center gap-1">
        <div 
          className={`w-2 h-2 rounded-full ${
            activeSessionCount === 1 
              ? 'bg-green-500' 
              : activeSessionCount === 2 
              ? 'bg-yellow-500' 
              : 'bg-red-500'
          }`} 
        />
        <span>{activeSessionCount}/2 active sessions</span>
      </div>
    </div>
  )
}