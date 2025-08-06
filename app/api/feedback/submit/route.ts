import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/auth"

interface FeedbackRequest {
  feedback_type: string
  urgency_level: string
  description: string
  page_url: string
  device_info: {
    os: string
    browser: string
    screen: {
      width: number
      height: number
    }
    userAgent: string
  }
  email?: string // For guest users
}

export async function POST(request: Request) {
  try {
    const body: FeedbackRequest = await request.json()
    
    // Validate required fields
    if (!body.feedback_type || !body.urgency_level || !body.page_url) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate feedback type
    const validFeedbackTypes = [
      'BUG_REPORT',
      'FEATURE_REQUEST',
      'UI_ISSUE', 
      'PERFORMANCE_ISSUE',
      'CONTENT_SUGGESTION',
      'ACCOUNT_ISSUE',
      'PAYMENT_ISSUE',
      'DATA_PROBLEM',
      'OTHER'
    ]

    if (!validFeedbackTypes.includes(body.feedback_type)) {
      return NextResponse.json(
        { error: "Invalid feedback type" },
        { status: 400 }
      )
    }

    // Validate urgency level
    const validUrgencyLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    if (!validUrgencyLevels.includes(body.urgency_level)) {
      return NextResponse.json(
        { error: "Invalid urgency level" },
        { status: 400 }
      )
    }

    // Validate description for required types
    const requiresDescription = ['BUG_REPORT', 'OTHER']
    if (requiresDescription.includes(body.feedback_type)) {
      if (!body.description || body.description.trim().length < 10) {
        return NextResponse.json(
          { error: "Description must be at least 10 characters for this feedback type" },
          { status: 400 }
        )
      }
    }

    const supabase = await createClient()
    
    // Try to get current user (may be null for guest users)
    let user = null
    try {
      user = await getUser()
    } catch (error) {
      // User not authenticated - that's okay for feedback
      console.log("Guest user submitting feedback")
    }

    // Prepare device info as JSON string
    const deviceInfoString = JSON.stringify(body.device_info)

    // Insert feedback into database
    const { data, error } = await supabase
      .from('app_feedbacks')
      .insert({
        user_id: user?.id || null,
        feedback_type: body.feedback_type,
        urgency_level: body.urgency_level,
        description: body.description || null,
        page_url: body.page_url,
        device_info: deviceInfoString,
        // Add email to description for guest users if provided
        ...(body.email && !user && {
          description: `${body.description || ''}\n\nContact Email: ${body.email}`.trim()
        })
      })
      .select()
      .single()

    if (error) {
      console.error("Error inserting feedback:", error)
      return NextResponse.json(
        { error: "Failed to submit feedback" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      feedback_id: data.id,
      message: "Feedback submitted successfully"
    })

  } catch (error) {
    console.error("Error in feedback submission:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}