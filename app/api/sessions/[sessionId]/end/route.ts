import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { completeSession } from "@/lib/session-utils"
import { verifySession } from "@/lib/auth"

export async function POST(req: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await context.params

    // Authenticate user
    const userSession = await verifySession()
    
    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify session exists and user has access
    const supabase = await createClient()
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userSession.user.id) // Ensure user owns the session
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Complete the session
    const success = await completeSession(sessionId)

    if (!success) {
      return NextResponse.json({ error: "Failed to end session" }, { status: 500 })
    }

    // Clear active_session_id from user's profile
    await supabase
      .from("profiles")
      .update({ active_session_id: null })
      .eq("id", userSession.user.id)

    return NextResponse.json({ 
      success: true,
      message: "Session ended successfully"
    })

  } catch (error) {
    console.error("Error ending session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
