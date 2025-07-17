import { Suspense } from 'react'
import { verifySession } from "@/lib/auth"
import { LoginForm } from "@/components/auth/login-form"
import { EnhancedCreateTestInterface } from "@/components/test/enhanced-create-test-interface"
import { ActiveSessionCard } from "@/components/test/active-session-card"
import { FullPageSpinner } from '@/components/ui/loading-spinner'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await verifySession()

  if (!session) {
    return (
      <Suspense fallback={<FullPageSpinner />}>
        <LoginForm />
      </Suspense>
    )
  }

  return (
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <ActiveSessionCard />
      </div>
      <EnhancedCreateTestInterface userProfile={session.profile} />
    </div>
  )
}
