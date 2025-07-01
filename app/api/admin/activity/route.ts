import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin-client"

export async function GET() {
  const supabase = createAdminClient()

  try {
    const { data: questions, error } = await supabase
      .from("questions")
      .select(
        `
        id,
        question_text,
        created_at,
        updated_at,
        specialty:specialties(name)
      `,
      )
      .order("updated_at", { ascending: false }) // Order by last updated
      .limit(10) // Get the 10 most recent activities

    if (error) throw error

    const activities = questions.map((q: any) => {
      const createdAt = new Date(q.created_at as string)
      const updatedAt = new Date(q.updated_at as string)
      // Simple heuristic: if created_at and updated_at are very close, assume it's a creation
      const isCreated = Math.abs(createdAt.getTime() - updatedAt.getTime()) < 1000 // within 1 second

      let action = ""
      let type = ""
      if (isCreated) {
        action = "Created question"
        type = "create"
      } else {
        action = "Updated question"
        type = "update"
      }

      const subject = `${q.specialty?.name ? q.specialty.name + " - " : ""}${q.question_text.substring(0, 50)}...` // Truncate question text

      // Calculate time ago for display
      const now = new Date()
      const diffMs = now.getTime() - updatedAt.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMinutes / 60)
      const diffDays = Math.floor(diffHours / 24)

      let timeAgo = ""
      if (diffMinutes < 1) {
        timeAgo = "just now"
      } else if (diffMinutes < 60) {
        timeAgo = `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`
      } else if (diffHours < 24) {
        timeAgo = `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
      } else {
        timeAgo = `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
      }

      return {
        action,
        subject,
        time: timeAgo,
        type,
      }
    })

    return NextResponse.json({ activities })
  } catch (err) {
    console.error("Error fetching recent activity:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
