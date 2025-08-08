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