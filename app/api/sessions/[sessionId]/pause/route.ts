import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { safelyPauseSession } from "@/lib/session-utils"

export async function POST(req: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await context.params

    // Verify session exists and user has access
    const supabase = await createClient()
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Pause the session
    const result = await safelyPauseSession(sessionId)

    if (!result.success) {
      return NextResponse.json({ error: "Failed to pause session" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: "Session paused successfully"
    })

  } catch (error) {
    console.error("Error pausing session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
