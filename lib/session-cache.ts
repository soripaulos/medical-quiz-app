import type { UserSession, Question, UserAnswer, UserQuestionProgress, UserNote } from '@/lib/types'

interface CachedSessionData {
  // Core session info
  sessionId: string
  session: UserSession
  questions: Question[]
  
  // User state
  userAnswers: UserAnswer[]
  userProgress: UserQuestionProgress[]
  userNotes: UserNote[]
  selectedAnswers: Record<string, string>
  showExplanations: Record<string, boolean>
  
  // UI state
  currentQuestionIndex: number
  
  // Metadata
  lastCached: number
  url: string
  isActive: boolean
}

const CACHE_KEY = 'testSessionCache'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

export class SessionCache {
  
  static save(data: {
    sessionId: string
    session: UserSession
    questions: Question[]
    userAnswers: UserAnswer[]
    userProgress: UserQuestionProgress[]
    userNotes?: UserNote[]
    selectedAnswers: Record<string, string>
    showExplanations: Record<string, boolean>
    currentQuestionIndex: number
  }): boolean {
    try {
      const cachedData: CachedSessionData = {
        ...data,
        userNotes: data.userNotes || [],
        lastCached: Date.now(),
        url: window.location.href,
        isActive: true
      }
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData))
      
      // Also update the legacy activeTestSession for backward compatibility
      const legacyData = {
        sessionId: data.sessionId,
        sessionName: data.session.session_name,
        sessionType: data.session.session_type,
        currentQuestionIndex: data.currentQuestionIndex,
        startTime: new Date(data.session.created_at).getTime(),
        lastActivity: Date.now(),
        url: window.location.href,
        isActive: true
      }
      localStorage.setItem('activeTestSession', JSON.stringify(legacyData))
      
      console.log('Session state cached successfully')
      return true
    } catch (error) {
      console.error('Failed to cache session state:', error)
      return false
    }
  }
  
  static load(): CachedSessionData | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return null
      
      const data: CachedSessionData = JSON.parse(cached)
      
      // Check if cache is expired
      if (Date.now() - data.lastCached > CACHE_EXPIRY) {
        console.log('Session cache expired, clearing')
        this.clear()
        return null
      }
      
      console.log('Session state loaded from cache')
      return data
    } catch (error) {
      console.error('Failed to load session state from cache:', error)
      return null
    }
  }
  
  static update(updates: Partial<CachedSessionData>): boolean {
    try {
      const existing = this.load()
      if (!existing) return false
      
      const updated = {
        ...existing,
        ...updates,
        lastCached: Date.now()
      }
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated))
      return true
    } catch (error) {
      console.error('Failed to update session cache:', error)
      return false
    }
  }
  
  static updateAnswers(selectedAnswers: Record<string, string>, userAnswers: UserAnswer[]): boolean {
    return this.update({ selectedAnswers, userAnswers })
  }
  
  static updateProgress(userProgress: UserQuestionProgress[]): boolean {
    return this.update({ userProgress })
  }
  
  static updateCurrentQuestion(currentQuestionIndex: number): boolean {
    return this.update({ currentQuestionIndex })
  }
  
  static updateExplanations(showExplanations: Record<string, boolean>): boolean {
    return this.update({ showExplanations })
  }
  
  static updateNotes(userNotes: UserNote[]): boolean {
    return this.update({ userNotes })
  }
  
  static clear(): void {
    try {
      localStorage.removeItem(CACHE_KEY)
      localStorage.removeItem('activeTestSession')
      console.log('Session cache cleared')
    } catch (error) {
      console.error('Failed to clear session cache:', error)
    }
  }
  
  static isActive(): boolean {
    const cached = this.load()
    return cached?.isActive === true
  }
  
  static getSessionId(): string | null {
    const cached = this.load()
    return cached?.sessionId || null
  }
  
  static setInactive(): boolean {
    return this.update({ isActive: false })
  }
  
  static hasCache(): boolean {
    return localStorage.getItem(CACHE_KEY) !== null
  }
}