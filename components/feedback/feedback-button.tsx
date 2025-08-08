"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"
import { FeedbackModal } from "./feedback-modal"

interface FeedbackButtonProps {
  variant?: "default" | "ghost" | "outline"
  size?: "sm" | "icon" | "default"
  className?: string
  showText?: boolean
}

export function FeedbackButton({ 
  variant = "ghost", 
  size = "icon", 
  className = "",
  showText = false 
}: FeedbackButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button 
        variant={variant} 
        size={size} 
        onClick={() => setIsModalOpen(true)}
        className={className}
        title="Send Feedback"
      >
        <MessageSquare className="h-4 w-4" />
        {showText && <span className="ml-2">Feedback</span>}
        <span className="sr-only">Send Feedback</span>
      </Button>
      
      <FeedbackModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </>
  )
}