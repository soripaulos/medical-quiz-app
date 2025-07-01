import { TestSession } from "@/components/test/test-session"
import { AuthWrapper } from "@/components/auth/auth-wrapper"

interface TestPageProps {
  params: Promise<{
    sessionId: string
  }>
}

export default async function TestPage({ params }: TestPageProps) {
  const { sessionId } = await params
  return (
    <AuthWrapper>
      <TestSession sessionId={sessionId} />
    </AuthWrapper>
  )
}
