import { TestSession } from "@/components/test/test-session"

interface TestPageProps {
  params: {
    sessionId: string
  }
}

export default function TestPage({ params }: TestPageProps) {
  return <TestSession sessionId={params.sessionId} />
}
