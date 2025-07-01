import { TestResults } from "@/components/test/test-results"
import { AuthWrapper } from "@/components/auth/auth-wrapper"

interface ResultsPageProps {
  params: Promise<{
    sessionId: string
  }>
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { sessionId } = await params
  return (
    <AuthWrapper>
      <TestResults sessionId={sessionId} />
    </AuthWrapper>
  )
}
