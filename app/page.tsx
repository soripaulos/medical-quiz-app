import { redirect } from "next/navigation"
import { verifySession } from "@/lib/auth"
import { LandingPage } from "@/components/marketing/landing-page"

export const dynamic = "force-dynamic"

export default async function Page() {
  const session = await verifySession()

  if (session) {
    redirect("/create-test")
  }

  return <LandingPage />
}
