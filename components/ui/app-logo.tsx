"use client"

import React from "react"

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
      {/* Clipboard Icon */}
      <div className={`${sizeClasses[size]} relative`}>
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-full h-full"
        >
          {/* Clipboard base */}
          <rect
            x="6"
            y="2"
            width="12"
            height="16"
            rx="2"
            ry="2"
            fill="currentColor"
          />
          {/* Checkmarks on left side */}
          <path
            d="M8 6h2v1H8z M8 8h2v1H8z M8 10h2v1H8z"
            fill="white"
          />
          {/* Lines on right side */}
          <path
            d="M14 6h2v1h-2z M14 8h2v1h-2z M14 10h2v1h-2z"
            fill="white"
          />
          {/* Pen/pencil */}
          <path
            d="M16 18l-2-2 1-1 2 2-1 1z"
            fill="currentColor"
          />
          <path
            d="M15 17l-1-1 1-1 1 1-1 1z"
            fill="currentColor"
          />
        </svg>
      </div>
      
      {/* Text */}
      <span className={`font-bold ${textSizes[size]} text-foreground`}>
        MedPrep<span className="text-primary">ET</span>
      </span>
    </div>
  )
} 