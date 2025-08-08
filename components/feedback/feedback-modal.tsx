"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  Bug, 
  Lightbulb, 
  Palette, 
  Zap, 
  FileText, 
  User, 
  CreditCard, 
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle
} from "lucide-react"

interface FeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FeedbackType {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  requiresDescription: boolean
}

interface DeviceInfo {
  os: string
  browser: string
  screen: {
    width: number
    height: number
  }
  userAgent: string
}

const feedbackTypes: FeedbackType[] = [
  {
    id: "BUG_REPORT",
    label: "Bug Report",
    description: "Report a problem or error you encountered",
    icon: <Bug className="h-5 w-5 text-red-500" />,
    requiresDescription: true
  },
  {
    id: "FEATURE_REQUEST",
    label: "Feature Request", 
    description: "Suggest a new feature or improvement",
    icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
    requiresDescription: false
  },
  {
    id: "UI_ISSUE",
    label: "UI Issue",
    description: "Report design or interface problems",
    icon: <Palette className="h-5 w-5 text-purple-500" />,
    requiresDescription: false
  },
  {
    id: "PERFORMANCE_ISSUE", 
    label: "Performance Issue",
    description: "Report slow loading or performance problems",
    icon: <Zap className="h-5 w-5 text-orange-500" />,
    requiresDescription: false
  },
  {
    id: "CONTENT_SUGGESTION",
    label: "Content Suggestion",
    description: "Suggest improvements to questions or content",
    icon: <FileText className="h-5 w-5 text-blue-500" />,
    requiresDescription: false
  },
  {
    id: "ACCOUNT_ISSUE",
    label: "Account Problem", 
    description: "Issues with your account or profile",
    icon: <User className="h-5 w-5 text-green-500" />,
    requiresDescription: false
  },
  {
    id: "PAYMENT_ISSUE",
    label: "Payment Issue",
    description: "Problems with billing or payments",
    icon: <CreditCard className="h-5 w-5 text-indigo-500" />,
    requiresDescription: false
  },
  {
    id: "OTHER",
    label: "Other",
    description: "Something else not covered above",
    icon: <HelpCircle className="h-5 w-5 text-gray-500" />,
    requiresDescription: true
  }
]

const urgencyLevels = [
  { id: "LOW", label: "Low", description: "Minor issue, no rush", color: "text-green-600" },
  { id: "MEDIUM", label: "Medium", description: "Moderate priority", color: "text-yellow-600" },
  { id: "HIGH", label: "High", description: "Important issue", color: "text-orange-600" },
  { id: "CRITICAL", label: "Critical", description: "Urgent, blocking issue", color: "text-red-600" }
]

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState<string>("")
  const [urgency, setUrgency] = useState<string>("MEDIUM")
  const [description, setDescription] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/stats')
        setIsAuthenticated(response.ok)
      } catch {
        setIsAuthenticated(false)
      }
    }
    if (open) {
      checkAuth()
    }
  }, [open])

  // Auto-set HIGH urgency for bug reports
  useEffect(() => {
    if (selectedType === "BUG_REPORT") {
      setUrgency("HIGH")
    }
  }, [selectedType])

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setStep(1)
      setSelectedType("")
      setUrgency("MEDIUM")
      setDescription("")
      setEmail("")
    }
  }, [open])

  const getDeviceInfo = (): DeviceInfo => {
    const userAgent = navigator.userAgent
    
    // Detect OS
    let os = "Unknown"
    if (userAgent.includes("Windows")) os = "Windows"
    else if (userAgent.includes("Mac")) os = "macOS"
    else if (userAgent.includes("Linux")) os = "Linux"
    else if (userAgent.includes("Android")) os = "Android"
    else if (userAgent.includes("iOS")) os = "iOS"

    // Detect Browser
    let browser = "Unknown"
    if (userAgent.includes("Chrome")) browser = "Chrome"
    else if (userAgent.includes("Firefox")) browser = "Firefox"
    else if (userAgent.includes("Safari")) browser = "Safari"
    else if (userAgent.includes("Edge")) browser = "Edge"

    return {
      os,
      browser,
      screen: {
        width: window.screen.width,
        height: window.screen.height
      },
      userAgent
    }
  }

  const selectedTypeData = feedbackTypes.find(type => type.id === selectedType)
  const canProceedToStep2 = selectedType !== ""
  const canSubmit = selectedType && (
    !selectedTypeData?.requiresDescription || 
    (description.trim().length >= 10)
  ) && (!email || email.includes("@")) // Basic email validation if provided

  const handleSubmit = async () => {
    if (!canSubmit) return

    setIsSubmitting(true)
    
    try {
      const deviceInfo = getDeviceInfo()
      
      const response = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedback_type: selectedType,
          urgency_level: urgency,
          description: description.trim() || undefined,
          page_url: window.location.href,
          device_info: deviceInfo,
          email: email.trim() || undefined
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success("Feedback submitted successfully!", {
          description: "Thank you for helping us improve the platform."
        })
        onOpenChange(false)
      } else {
        throw new Error(result.error || "Failed to submit feedback")
      }
    } catch (error) {
      console.error("Error submitting feedback:", error)
      toast.error("Failed to submit feedback", {
        description: "Please try again or contact support.",
        action: {
          label: "Retry",
          onClick: () => handleSubmit()
        }
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Help us improve by sharing your thoughts, reporting issues, or suggesting features.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">What type of feedback do you have?</Label>
              <p className="text-sm text-muted-foreground mb-4">Select the category that best describes your feedback.</p>
            </div>
            
            <RadioGroup value={selectedType} onValueChange={setSelectedType}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {feedbackTypes.map((type) => (
                  <div key={type.id} className="relative">
                    <RadioGroupItem
                      value={type.id}
                      id={type.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={type.id}
                      className="flex flex-col items-start space-y-2 rounded-lg border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        {type.icon}
                        <span className="font-medium">{type.label}</span>
                        {type.id === "BUG_REPORT" && (
                          <Badge variant="destructive" className="text-xs">Auto-High</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>

            <div className="flex justify-end">
              <Button 
                onClick={() => setStep(2)} 
                disabled={!canProceedToStep2}
                className="min-w-[100px]"
              >
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Provide Details</Label>
                <p className="text-sm text-muted-foreground">Help us understand your feedback better.</p>
              </div>
              <div className="flex items-center space-x-2">
                {selectedTypeData?.icon}
                <span className="font-medium">{selectedTypeData?.label}</span>
              </div>
            </div>

            {/* Urgency Selection */}
            <div className="space-y-3">
              <Label>Urgency Level {selectedType === "BUG_REPORT" && <span className="text-xs text-muted-foreground">(Auto-set for bug reports)</span>}</Label>
              <Select 
                value={urgency} 
                onValueChange={setUrgency}
                disabled={selectedType === "BUG_REPORT"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {urgencyLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      <div className="flex items-center space-x-2">
                        <span className={level.color}>●</span>
                        <span>{level.label}</span>
                        <span className="text-sm text-muted-foreground">- {level.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description
                {selectedTypeData?.requiresDescription && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <Textarea
                id="description"
                placeholder={`Please describe your ${selectedTypeData?.label.toLowerCase()}...`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
              {selectedTypeData?.requiresDescription && (
                <p className="text-xs text-muted-foreground">
                  Minimum 10 characters required ({description.trim().length}/10)
                </p>
              )}
            </div>

            {/* Email for guest users */}
            {!isAuthenticated && (
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Provide your email if you'd like us to follow up with you.
                </p>
              </div>
            )}

            {/* Auto-captured metadata info */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-2">Auto-captured Information:</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Current page: {typeof window !== 'undefined' ? window.location.pathname : 'Unknown'}</p>
                  <p>• Device: {typeof window !== 'undefined' ? (window.innerWidth < 768 ? 'Mobile' : 'Desktop') : 'Unknown'}</p>
                  <p>• Screen: {typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'Unknown'}</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!canSubmit || isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Submit
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}