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
      .select("id, user_id, is_active")
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
      activeTime: activeTime || 0 
    })
  } catch (err) {
    console.error("Error getting active time:", err)
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    )
  }
} 