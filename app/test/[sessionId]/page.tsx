import { getUser } from "@/lib/auth"
import { TestSession } from "@/components/test/test-session"

interface TestPageProps {
  params: Promise<{
    sessionId: string
  }>
}

export default async function TestPage({ params }: TestPageProps) {
  // This will redirect to login if not authenticated
  await getUser()
  
  const { sessionId } = await params
  return <TestSession sessionId={sessionId} />
}
