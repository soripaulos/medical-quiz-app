import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  // Check if environment variables are available (they might not be during build)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === 'production' || process.env.CI) {
      throw new Error("Supabase environment variables not configured")
    }
    // Return a mock client for build-time
    return {
      from: () => ({
        select: () => ({ 
          eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
          in: () => Promise.resolve({ data: [], error: null }),
          not: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
          order: () => Promise.resolve({ data: [], error: null }),
          range: () => Promise.resolve({ data: [], error: null, count: 0 }),
          ilike: () => ({ eq: () => Promise.resolve({ data: [], error: null }) })
        }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        rpc: () => Promise.resolve({ data: [], error: null })
      })
    } as any
  }

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}
