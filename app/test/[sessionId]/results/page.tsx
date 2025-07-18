import { getUser } from "@/lib/auth"
import { TestResults } from "@/components/test/test-results"

interface ResultsPageProps {
  params: Promise<{
    sessionId: string
  }>
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  // This will redirect to login if not authenticated
  await getUser()
  
  const { sessionId } = await params
  return <TestResults sessionId={sessionId} />
}
