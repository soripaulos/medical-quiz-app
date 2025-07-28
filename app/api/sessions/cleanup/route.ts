import { NextResponse } from "next/server"
import { cleanupInactiveSessions } from "@/lib/session-utils"

export async function POST() {
  try {
    // Clean up inactive sessions (sessions inactive for more than 24 hours)
    const cleanedCount = await cleanupInactiveSessions()

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanedCount} inactive sessions`
    })

  } catch (error) {
    console.error("Error in cleanup:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Also allow GET requests for easier testing
export async function GET() {
  return POST()
}