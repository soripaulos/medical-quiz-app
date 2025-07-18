"use client"

import React from "react"
import { ClipboardPlus } from "lucide-react"

interface AppLogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function AppLogo({ className = "", size = "md" }: AppLogoProps) {
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

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Clipboard Plus Icon */}
      <ClipboardPlus className={`${sizeClasses[size]} text-primary`} />
      
      {/* Text */}
      <span className={`font-bold ${textSizes[size]} text-foreground`}>
        MedPrep<span className="text-blue-800 dark:text-blue-300">ET</span>
      </span>
    </div>
  )
} 