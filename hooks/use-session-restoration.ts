"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { SessionCache } from '@/lib/session-cache'

// Key for tracking navigation dismissal
const RESTORATION_DISMISSED_KEY = 'sessionRestorationDismissed'

export function useSessionRestoration() {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const [showRestorationPrompt, setShowRestorationPrompt] = useState(false)

  useEffect(() => {
    // Only run restoration check on homepage or dashboard pages
    const shouldCheckForRestoration = pathname === '/' || 
                                     pathname === '/dashboard' || 
                                     pathname.startsWith('/test/create')

    if (!shouldCheckForRestoration) {
      setIsChecking(false)
      return
    }

    const checkAndRestore = async () => {
      try {
        const cached = SessionCache.load()
        
        if (cached && cached.isActive) {
          // Check if user previously dismissed restoration for this session
          const dismissedSessionId = sessionStorage.getItem(RESTORATION_DISMISSED_KEY)
          if (dismissedSessionId === cached.sessionId) {
            console.log('Session restoration was dismissed by user')
            setHasActiveSession(false)
            setIsChecking(false)
            return
          }

          // Check if this looks like a page refresh vs intentional navigation
          const isLikelyRefresh = checkIfLikelyRefresh()
          
          if (isLikelyRefresh) {
            console.log('Detected page refresh, auto-restoring session')
            setHasActiveSession(true)
            
            // Small delay to prevent jarring redirect
            setTimeout(() => {
              router.push(`/test/${cached.sessionId}`)
            }, 100)
          } else {
            console.log('Detected navigation, showing restoration prompt')
            setShowRestorationPrompt(true)
          }
          
          return
        }
        
        setHasActiveSession(false)
      } catch (error) {
        console.error('Error checking for session restoration:', error)
        setHasActiveSession(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkAndRestore()
  }, [pathname, router])

  // Heuristic to detect if this is likely a page refresh vs intentional navigation
  const checkIfLikelyRefresh = () => {
    try {
      // Check if we have navigation history
      if (window.history.length <= 1) {
        return true // Direct URL access or refresh
      }

      // Check performance navigation type (if available)
      if ('performance' in window && 'navigation' in window.performance) {
        const navType = (window.performance as any).navigation?.type
        if (navType === 'reload') {
          return true
        }
      }

      // Check if referrer is same origin (back navigation usually has referrer)
      if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
        return false // Likely internal navigation
      }

      // Default to treating as refresh if we can't determine
      return true
    } catch (error) {
      console.error('Error checking navigation type:', error)
      return false // Err on side of caution
    }
  }

  const restoreSession = () => {
    const cached = SessionCache.load()
    if (cached && cached.isActive) {
      setShowRestorationPrompt(false)
      setHasActiveSession(true)
      router.push(`/test/${cached.sessionId}`)
    }
  }

  const dismissRestoration = () => {
    const cached = SessionCache.load()
    if (cached) {
      // Remember dismissal for this session
      sessionStorage.setItem(RESTORATION_DISMISSED_KEY, cached.sessionId)
    }
    setShowRestorationPrompt(false)
    setHasActiveSession(false)
  }

  return {
    isChecking,
    hasActiveSession,
    showRestorationPrompt,
    restoreSession,
    dismissRestoration
  }
}