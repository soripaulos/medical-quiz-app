"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { LoginForm } from "./login-form"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { LogOut, Shield } from "lucide-react"

interface AuthWrapperProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function AuthWrapper({ children, requireAdmin = false }: AuthWrapperProps) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  // Automatically redirect to login if no user is present and not loading
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <LoginForm />
  }

  // Note: Admin role checking moved to server-side components
  // Client-side components should use the DAL requireAdmin() function in server components
  if (requireAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 max-w-md">
            Admin access is required. Please ensure you have administrator privileges.
          </p>
          <div className="pt-4 space-x-2">
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
