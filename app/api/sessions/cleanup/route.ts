import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/auth"
import { cleanupOrphanedSessions } from "@/lib/session-utils"

export async function POST() {
  try {
    // Get current user
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Clean up orphaned sessions for the user
    await cleanupOrphanedSessions(user.id)

    return NextResponse.json({ success: true, message: "Orphaned sessions cleaned up" })
  } catch (error) {
    console.error("Error cleaning up orphaned sessions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Also allow GET requests for easier testing
export async function GET() {
  return POST()
}