import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/hooks/use-auth"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Medical Quiz App",
  description: "A comprehensive medical quiz application for USMLE preparation",
    generator: 'v0.dev'
}

// Check if we have environment variables available
const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {hasSupabaseConfig ? (
          <AuthProvider>{children}</AuthProvider>
        ) : (
          children
        )}
      </body>
    </html>
  )
}
