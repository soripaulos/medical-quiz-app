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

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    )
  }

  // At this point, user is authenticated
  if (requireAdmin) {
    // Note: Actual admin role check is done on the server via `requireAdmin`
    // This is a client-side fallback UI.
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 max-w-md">
            You do not have permission to view this page.
          </p>
          <div className="pt-4 space-x-2">
            <Button variant="outline" onClick={() => router.push("/")}>
              Go to Homepage
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
