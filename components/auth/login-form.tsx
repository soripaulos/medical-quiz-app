"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, ShieldCheck, Stethoscope } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AppLogo } from "@/components/ui/app-logo"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { createClient } from "@/lib/supabase/client"

export function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const urlError = searchParams.get("error")
    if (urlError) setError(decodeURIComponent(urlError))
  }, [searchParams])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${location.origin}/auth/callback`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      })
      if (error) throw error
    } catch (error: any) {
      setError(error.error_description || error.message)
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f5f1e8] text-[#152a34] lg:grid-cols-[.88fr_1.12fr]">
      <section className="relative hidden overflow-hidden border-r border-[#152a34]/15 bg-[#152a34] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -bottom-28 -right-16 font-serif text-[24rem] leading-none text-white/[0.025]">M</div>
        <Link href="/" className="relative inline-flex w-fit items-center gap-2 text-white">
          <Stethoscope className="h-7 w-7 text-[#e6a56c]" />
          <span className="text-xl font-bold">MedPrep<span className="text-[#e6a56c]">ET</span></span>
        </Link>
        <div className="relative max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e6a56c]">Your study workspace</p>
          <h1 className="mt-5 font-serif text-5xl font-semibold leading-tight">Return to the questions that move you forward.</h1>
          <p className="mt-6 text-lg leading-8 text-white/65">Build focused practice, continue active sessions and review the patterns in your performance.</p>
          <div className="mt-10 grid gap-4 border-t border-white/15 pt-7 text-sm text-white/75 sm:grid-cols-2">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#e6a56c]" /> Practice and exam modes</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#e6a56c]" /> Session history</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#e6a56c]" /> In-test study tools</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#e6a56c]" /> Performance tracking</span>
          </div>
        </div>
        <p className="relative text-xs text-white/40">Medical exam preparation, built for Ethiopia.</p>
      </section>

      <section className="flex min-h-screen flex-col">
        <div className="flex h-20 items-center justify-between border-b border-[#152a34]/15 px-5 sm:px-10 lg:px-14">
          <Link href="/" className="lg:hidden"><AppLogo /></Link>
          <Link href="/" className="ml-auto inline-flex items-center gap-2 text-sm font-semibold text-[#40545c] hover:text-[#b54932] lg:ml-0">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10 lg:px-14">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center border border-[#397267]/30 bg-[#e4eadf] text-[#397267]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b54932]">Student access</p>
              <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight">Sign in to MedPrep ET</h2>
              <p className="mt-4 leading-7 text-[#52646b]">Use your Google account to open your study dashboard and continue your preparation.</p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-5 rounded-none">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleGoogleSignIn}
              className="h-13 w-full rounded-none bg-[#152a34] py-6 text-base text-white hover:bg-[#b54932]"
              disabled={loading}
            >
              {loading ? <LoadingSpinner /> : (
                <>
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <p className="mt-5 text-center text-xs leading-5 text-[#6b7b80]">By continuing, you agree to the terms of service and privacy policy.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
