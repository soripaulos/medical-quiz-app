import { TestResults } from "@/components/test/test-results"

interface ResultsPageProps {
  params: Promise<{
    sessionId: string
  }>
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { sessionId } = await params
  return <TestResults sessionId={sessionId} />
}
