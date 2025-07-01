"use client"

import React from "react"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { LogOut, Shield } from "lucide-react"

interface AuthWrapperProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function AuthWrapper({ children, requireAdmin = false }: AuthWrapperProps) {
  const { profile, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (requireAdmin && profile?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="max-w-md">
            You don't have permission to access this page. This area is restricted to administrators only.
          </p>
          <p className="text-sm text-muted-foreground">
            Current role: <span className="font-medium">{profile?.role ?? "none"}</span>
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
