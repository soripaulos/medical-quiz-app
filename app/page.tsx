"use client"

import { EnhancedCreateTestInterface } from "@/components/test/enhanced-create-test-interface"
import { AuthWrapper } from "@/components/auth/auth-wrapper"

export default function HomePage() {
  return (
    <AuthWrapper>
      <EnhancedCreateTestInterface />
    </AuthWrapper>
  )
}
