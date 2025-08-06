import { createClient } from '@/lib/supabase/server'

export interface UserSession {
  id: string
  user_id: string
  is_active: boolean
  created_at: string
  last_activity: string
  ended_at: string | null
  user_agent: string | null
  ip_address: string | null
}

export class SessionManager {
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
  }

  /**
   * Get all active sessions for a user
   */
  async getActiveSessions(userId: string): Promise<UserSession[]> {
    const { data, error } = await this.supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching active sessions:', error)
      return []
    }

    return data || []
  }

  /**
   * Create a new session and enforce the 2-device limit
   */
  async createSession(
    userId: string, 
    userAgent?: string, 
    ipAddress?: string
  ): Promise<{ success: boolean; deactivatedSessions?: string[] }> {
    try {
      // Get current active sessions
      const activeSessions = await this.getActiveSessions(userId)
      const deactivatedSessions: string[] = []

      // If user has 2 or more active sessions, deactivate the oldest ones
      if (activeSessions.length >= 2) {
        const sessionsToDeactivate = activeSessions.slice(1) // Keep the most recent
        
        for (const session of sessionsToDeactivate) {
          const { error } = await this.supabase
            .from('user_sessions')
            .update({ 
              is_active: false, 
              ended_at: new Date().toISOString() 
            })
            .eq('id', session.id)

          if (!error) {
            deactivatedSessions.push(session.id)
          }
        }
      }

      // Create new session
      const { error: insertError } = await this.supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          is_active: true,
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          user_agent: userAgent,
          ip_address: ipAddress,
        })

      if (insertError) {
        console.error('Error creating new session:', insertError)
        return { success: false }
      }

      return { 
        success: true, 
        deactivatedSessions: deactivatedSessions.length > 0 ? deactivatedSessions : undefined 
      }
    } catch (error) {
      console.error('Error in createSession:', error)
      return { success: false }
    }
  }

  /**
   * Update session activity timestamp
   */
  async updateSessionActivity(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_active', true)
    } catch (error) {
      console.error('Error updating session activity:', error)
    }
  }

  /**
   * End a specific session
   */
  async endSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .update({ 
          is_active: false, 
          ended_at: new Date().toISOString() 
        })
        .eq('id', sessionId)

      return !error
    } catch (error) {
      console.error('Error ending session:', error)
      return false
    }
  }

  /**
   * End all active sessions for a user (useful for sign out all devices)
   */
  async endAllSessions(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .update({ 
          is_active: false, 
          ended_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('is_active', true)

      return !error
    } catch (error) {
      console.error('Error ending all sessions:', error)
      return false
    }
  }

  /**
   * Clean up old inactive sessions (housekeeping)
   */
  async cleanupOldSessions(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      await this.supabase
        .from('user_sessions')
        .delete()
        .eq('is_active', false)
        .lt('ended_at', cutoffDate.toISOString())
    } catch (error) {
      console.error('Error cleaning up old sessions:', error)
    }
  }
}

/**
 * Helper function to create a SessionManager instance
 */
export async function createSessionManager() {
  const supabase = await createClient()
  return new SessionManager(supabase)
}