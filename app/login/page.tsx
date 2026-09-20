import { Suspense } from "react"
import { redirect } from "next/navigation"
import { verifySession } from "@/lib/auth"
import { LoginForm } from "@/components/auth/login-form"
import { FullPageSpinner } from "@/components/ui/loading-spinner"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const session = await verifySession()

  if (session) {
    redirect("/create-test")
  }

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <LoginForm />
    </Suspense>
  )
}
