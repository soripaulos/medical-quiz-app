"use client"

import type { ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"
import { LoginForm } from "./login-form"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { LogOut, Shield } from "lucide-react"

interface AuthWrapperProps {
  children: ReactNode
  requireAdmin?: boolean
}

export function AuthWrapper({ children, requireAdmin = false }: AuthWrapperProps) {
  const { user, profile, loading, signOut } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <LoginForm />
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Setting up your profile...</h1>
          <p className="text-gray-600">Please wait while we prepare your account.</p>
          <LoadingSpinner />
          <div className="pt-4">
            <Button variant="outline" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (requireAdmin && profile.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 max-w-md">
            You don't have permission to access this page. This area is restricted to administrators only.
          </p>
          <p className="text-sm text-gray-500">
            Current role: <span className="font-medium">{profile.role}</span>
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
