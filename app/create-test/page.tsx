import { verifySession } from "@/lib/auth"
import { EnhancedCreateTestInterface } from "@/components/test/enhanced-create-test-interface"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UserSession } from "@/lib/types"

export const dynamic = 'force-dynamic'

export default async function CreateTestPage() {
  const session = await verifySession()
  
  if (!session) {
    redirect("/")
    return null
  }

  let activeSession: UserSession | null = null
  if (session.profile.active_session_id) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("id", session.profile.active_session_id)
      .eq("is_active", true)
      .single()
    activeSession = data
  }

  return <EnhancedCreateTestInterface userProfile={session.profile} activeSession={activeSession} />
}
