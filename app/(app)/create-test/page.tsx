import { verifySession, redirectToLogin } from "@/lib/auth"
import { EnhancedCreateTestInterface } from "@/components/test/enhanced-create-test-interface"

export default async function CreateTestPage() {
  const session = await verifySession()
  
  if (!session) {
    redirectToLogin()
    return null
  }

  return <EnhancedCreateTestInterface userProfile={session.profile} />
}
