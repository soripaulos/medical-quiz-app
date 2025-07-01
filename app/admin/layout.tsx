import type React from "react"
import { requireAdmin } from "@/lib/auth"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // This will redirect to login if not authenticated, or to home if not admin
  await requireAdmin()
  
  return <>{children}</>
}
