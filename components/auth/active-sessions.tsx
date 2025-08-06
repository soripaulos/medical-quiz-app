"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Smartphone, Monitor, Tablet, AlertCircle, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import type { UserSession } from "@/lib/session-management"

export function ActiveSessions() {
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchActiveSessions()
    }
  }, [user])

  const fetchActiveSessions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const endSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ 
          is_active: false, 
          ended_at: new Date().toISOString() 
        })
        .eq('id', sessionId)

      if (error) throw error
      
      // Refresh the sessions list
      await fetchActiveSessions()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Monitor className="h-4 w-4" />
    
    const ua = userAgent.toLowerCase()
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-4 w-4" />
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="h-4 w-4" />
    }
    return <Monitor className="h-4 w-4" />
  }

  const getDeviceInfo = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown Device'
    
    const ua = userAgent.toLowerCase()
    let device = 'Desktop'
    let browser = 'Unknown Browser'

    // Detect device type
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      device = 'Mobile'
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      device = 'Tablet'
    }

    // Detect browser
    if (ua.includes('chrome')) browser = 'Chrome'
    else if (ua.includes('firefox')) browser = 'Firefox'
    else if (ua.includes('safari')) browser = 'Safari'
    else if (ua.includes('edge')) browser = 'Edge'

    return `${device} • ${browser}`
  }

  const isCurrentSession = (session: UserSession) => {
    // This is a simple heuristic - in a real app, you'd want a more reliable way
    // to identify the current session
    return session.last_activity === sessions[0]?.last_activity
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Active Sessions
          <Badge variant="secondary">{sessions.length}/2</Badge>
        </CardTitle>
        <CardDescription>
          You can have up to 2 active sessions at the same time. New logins will automatically end the oldest session.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No active sessions found
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getDeviceIcon(session.user_agent)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {getDeviceInfo(session.user_agent)}
                      </span>
                      {isCurrentSession(session) && (
                        <Badge variant="outline" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Active since {new Date(session.created_at).toLocaleDateString()}
                      {session.ip_address && ` • ${session.ip_address}`}
                    </div>
                    <div className="text-xs text-gray-400">
                      Last activity: {new Date(session.last_activity).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {!isCurrentSession(session) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => endSession(session.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    End Session
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        
        {sessions.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">
              <strong>Note:</strong> When you reach the 2-session limit, logging in from a new device will automatically end your oldest session.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}