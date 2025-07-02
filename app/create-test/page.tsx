import { verifySession } from "@/lib/auth"
import { EnhancedCreateTestInterface } from "@/components/test/enhanced-create-test-interface"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function CreateTestPage() {
  const session = await verifySession()
  
  if (!session) {
    redirect("/")
    return null
  }

  return <EnhancedCreateTestInterface userProfile={session.profile} />
}
