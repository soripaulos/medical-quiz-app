import { verifySession, redirectToDashboard } from "@/lib/auth"
import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage() {
  const session = await verifySession()
  
  if (session) {
    redirectToDashboard()
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  )
} 