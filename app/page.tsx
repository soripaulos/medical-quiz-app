import { Suspense } from 'react'
import { verifySession } from "@/lib/auth"
import { LoginForm } from "@/components/auth/login-form"
import { EnhancedCreateTestInterface } from "@/components/test/enhanced-create-test-interface"
import { FullPageSpinner } from '@/components/ui/loading-spinner'

export const dynamic = 'force-dynamic'

async function HomePage() {
  const session = await verifySession()

  if (!session) {
    return <LoginForm />
  }

  return <EnhancedCreateTestInterface userProfile={session.profile} />
}

export default function Page() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <HomePage />
    </Suspense>
  )
}
