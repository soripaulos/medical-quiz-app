import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifySession } from "@/lib/auth"

export async function GET(req: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    // Authenticate user
    const session = await verifySession()
    
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const { sessionId } = await context.params

    // Verify the session belongs to the user
    const { data: userSession, error: sessionError } = await supabase
      .from("user_sessions")
      .select("id, user_id, is_active, time_remaining, session_type")
      .eq("id", sessionId)
      .eq("user_id", session.user.id)
      .single()

    if (sessionError || !userSession) {
      return NextResponse.json(
        { ok: false, message: "Session not found" },
        { status: 404 }
      )
    }

    // Calculate current active time using the database function
    const { data: activeTime, error: timeError } = await supabase.rpc('calculate_session_active_time', {
      session_id: sessionId
    })

    if (timeError) {
      console.error("Error calculating active time:", timeError)
      return NextResponse.json(
        { ok: false, message: "Failed to calculate active time" },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      ok: true, 
      activeTime: activeTime || 0,
      timeRemaining: userSession.time_remaining,
      sessionType: userSession.session_type
    })
  } catch (err) {
    console.error("Error getting active time:", err)
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    // Authenticate user
    const session = await verifySession()
    
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const { sessionId } = await context.params
    
    // Parse request body (optional - for time sync)
    let requestData = {}
    try {
      const text = await req.text()
      if (text) {
        requestData = JSON.parse(text)
      }
    } catch {
      // If no body or invalid JSON, continue with empty data
    }

    const { elapsedTime, timeRemaining } = requestData as { elapsedTime?: number; timeRemaining?: number }

    // Verify the session belongs to the user
    const { data: userSession, error: sessionError } = await supabase
      .from("user_sessions")
      .select("id, user_id, is_active, session_type, time_limit")
      .eq("id", sessionId)
      .eq("user_id", session.user.id)
      .single()

    if (sessionError || !userSession) {
      return NextResponse.json(
        { ok: false, message: "Session not found" },
        { status: 404 }
      )
    }

    // Update session with current timestamp and optional time data
    const updateData: any = {
      last_activity_at: new Date().toISOString()
    }

    // For exam mode, update time_remaining if provided
    if (userSession.session_type === "exam" && typeof timeRemaining === "number") {
      updateData.time_remaining = Math.max(0, timeRemaining)
    }

    // Update active time if provided
    if (typeof elapsedTime === "number") {
      updateData.active_time_seconds = elapsedTime
    }

    const { error: updateError } = await supabase
      .from("user_sessions")
      .update(updateData)
      .eq("id", sessionId)

    if (updateError) {
      console.error("Error updating session time:", updateError)
      return NextResponse.json(
        { ok: false, message: "Failed to update session time" },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      ok: true, 
      message: "Time updated successfully"
    })
  } catch (err) {
    console.error("Error updating active time:", err)
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    )
  }
} 