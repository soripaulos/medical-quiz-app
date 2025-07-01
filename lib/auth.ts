import { createClient } from "@/lib/supabase/server"
import type { NextRequest } from "next/server"

export async function getAuthenticatedUser(request?: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error("Unauthorized")
  }

  return user
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient()

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

  if (error || !profile) {
    throw new Error("Profile not found")
  }

  return profile
}

export async function requireAdmin(userId: string) {
  const profile = await getUserProfile(userId)

  if (profile.role !== "admin") {
    throw new Error("Admin access required")
  }

  return profile
}
