import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifySession } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sessionInfo = await verifySession()
    if (!sessionInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!sessionInfo.profile.active_session_id) {
      return NextResponse.json({ activeSession: null })
    }

    const supabase = await createClient()

    const { data: activeSession, error } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("id", sessionInfo.profile.active_session_id)
      .eq("is_active", true)
      .single()

    if (error) {
      // This can happen if the active_session_id is stale (e.g., session was deleted)
      // We can handle this gracefully by returning null.
      console.warn("Could not fetch active session:", error.message)
      return NextResponse.json({ activeSession: null })
    }

    return NextResponse.json({ activeSession })

  } catch (error) {
    console.error("Error fetching active session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 