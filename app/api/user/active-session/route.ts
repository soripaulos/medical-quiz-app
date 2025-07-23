import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifySession } from "@/lib/auth"

export async function GET() {
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

    // Get user's active session ID from their profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("active_session_id")
      .eq("id", session.user.id)
      .single()

    if (profileError) {
      console.error("Error fetching user profile:", profileError)
      return NextResponse.json(
        { ok: false, message: "Failed to fetch user profile" },
        { status: 500 }
      )
    }

    // If no active session, return null
    if (!profile.active_session_id) {
      return NextResponse.json({ activeSession: null })
    }

    // Fetch the active session details - exclude paused sessions
    const { data: activeSession, error: sessionError } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("id", profile.active_session_id)
      .eq("is_active", true) // Only return if session is still active
      .eq("is_paused", false) // Don't show paused sessions as active
      .single()

    if (sessionError) {
      // Session might have been deleted or completed
      // Clear the active_session_id from profile
      await supabase
        .from("profiles")
        .update({ active_session_id: null })
        .eq("id", session.user.id)
      
      return NextResponse.json({ activeSession: null })
    }

    return NextResponse.json({ activeSession })
  } catch (err) {
    console.error("Error fetching active session:", err)
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    )
  }
} 