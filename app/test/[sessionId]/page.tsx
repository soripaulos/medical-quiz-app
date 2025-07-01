import { TestSession } from "@/components/test/test-session"

interface TestPageProps {
  params: Promise<{
    sessionId: string
  }>
}

export default async function TestPage({ params }: TestPageProps) {
  const { sessionId } = await params
  return <TestSession sessionId={sessionId} />
}
