import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  // Check if environment variables are available (they might not be during build)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    // Check if we're in a build environment
    const isBuildTime = process.env.NODE_ENV === 'production' && 
                       (process.env.VERCEL || process.env.CI || process.env.BUILD_PHASE)
    
    if (!isBuildTime && process.env.NODE_ENV === 'production') {
      throw new Error("Supabase environment variables not configured")
    }
    // Return a comprehensive mock client for build-time
    return {
      from: () => ({
        select: (selectClause: string, options?: any) => ({
          eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
          in: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
            range: () => ({ order: () => Promise.resolve({ data: [], error: null, count: 0 }) })
          }),
          not: () => ({ 
            order: () => Promise.resolve({ data: [], error: null })
          }),
          order: () => Promise.resolve({ data: [], error: null }),
          range: () => ({ 
            order: () => Promise.resolve({ data: [], error: null, count: options?.count ? 0 : undefined })
          }),
          ilike: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
          single: () => Promise.resolve({ data: null, error: null })
        }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      }),
      rpc: () => Promise.resolve({ data: [], error: null })
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
