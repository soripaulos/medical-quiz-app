import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifySession } from "@/lib/auth"

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

    // Verify the session belongs to the user
    const { data: userSession, error: sessionError } = await supabase
      .from("user_sessions")
      .select("id, user_id, is_active, is_paused")
      .eq("id", sessionId)
      .eq("user_id", session.user.id)
      .single()

    if (sessionError || !userSession) {
      return NextResponse.json(
        { ok: false, message: "Session not found" },
        { status: 404 }
      )
    }

    if (!userSession.is_active) {
      return NextResponse.json(
        { ok: false, message: "Session is not active" },
        { status: 400 }
      )
    }

    // Resume session activity tracking using the database function
    const { error: resumeError } = await supabase.rpc('resume_session_activity', {
      session_id: sessionId
    })

    if (resumeError) {
      console.error("Error resuming session activity:", resumeError)
      return NextResponse.json(
        { ok: false, message: "Failed to resume session activity" },
        { status: 500 }
      )
    }

    // Get updated session data after resume to return current time values
    const { data: updatedSession, error: updateError } = await supabase
      .from("user_sessions")
      .select("id, active_time_seconds, time_remaining, session_type")
      .eq("id", sessionId)
      .single()

    if (updateError) {
      console.error("Error fetching updated session data:", updateError)
      return NextResponse.json({ ok: true, message: "Session activity resumed" })
    }

    return NextResponse.json({ 
      ok: true, 
      message: "Session activity resumed",
      sessionData: updatedSession
    })
  } catch (err) {
    console.error("Error resuming session activity:", err)
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    )
  }
} 