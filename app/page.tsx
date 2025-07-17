import { Suspense } from 'react'
import { verifySession } from "@/lib/auth"
import { LoginForm } from "@/components/auth/login-form"
import { EnhancedCreateTestInterface } from "@/components/test/enhanced-create-test-interface"
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
    <EnhancedCreateTestInterface userProfile={session.profile} />
  )
}
