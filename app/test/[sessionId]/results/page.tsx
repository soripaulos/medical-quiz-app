import { TestResults } from "@/components/test/test-results"

interface ResultsPageProps {
  params: {
    sessionId: string
  }
}

export default function ResultsPage({ params }: ResultsPageProps) {
  return <TestResults sessionId={params.sessionId} />
}
