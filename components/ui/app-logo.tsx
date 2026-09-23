"use client"

import React from "react"
import { ClipboardPlus } from "lucide-react"

interface AppLogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  tone?: "auto" | "dark"
}

export function AppLogo({ className = "", size = "md", tone = "auto" }: AppLogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  }

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl"
  }

  const forcedWordClass = tone === "dark" ? "text-slate-900" : "text-foreground"
  const forcedWrapperClass = tone === "dark" ? "text-slate-900" : ""

  return (
    <div className={`flex items-center gap-2 ${forcedWrapperClass} ${className}`}>
      <ClipboardPlus className={`${sizeClasses[size]} text-primary`} />
      <span className={`font-bold ${textSizes[size]} ${forcedWordClass}`}>
        MedPrep<span className="text-primary">ET</span>
      </span>
    </div>
  )
} 