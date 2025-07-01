import type React from "react"
import { AuthWrapper } from "@/components/auth/auth-wrapper"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthWrapper requireAdmin={true}>{children}</AuthWrapper>
}
