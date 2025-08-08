"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { SessionCache } from '@/lib/session-cache'

export function useSessionRestoration() {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [hasActiveSession, setHasActiveSession] = useState(false)

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
          console.log('Found active cached session, redirecting to test')
          setHasActiveSession(true)
          
          // Small delay to prevent jarring redirect
          setTimeout(() => {
            router.push(`/test/${cached.sessionId}`)
          }, 100)
          
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

  return {
    isChecking,
    hasActiveSession
  }
}

// Component wrapper for pages that should support session restoration
export function withSessionRestoration<T extends object>(
  Component: React.ComponentType<T>
) {
  return function SessionRestorationWrapper(props: T) {
    const { isChecking, hasActiveSession } = useSessionRestoration()

    if (isChecking) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking for active session...</p>
          </div>
        </div>
      )
    }

    if (hasActiveSession) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Resuming your test session...</p>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}