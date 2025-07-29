import { createBrowserClient } from "@supabase/ssr"

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Handle placeholder values during build
    if (!supabaseUrl || !supabaseKey || 
        supabaseUrl.includes('your_supabase') || supabaseKey.includes('your_')) {
      // Return a mock client for build time
      return {
        from: () => ({
          select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
          insert: () => Promise.resolve({ data: null, error: null }),
          update: () => Promise.resolve({ data: null, error: null }),
          delete: () => Promise.resolve({ data: null, error: null })
        }),
        auth: {
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
          signOut: () => Promise.resolve({ error: null })
        }
      } as any
    }
    
    supabaseClient = createBrowserClient(supabaseUrl, supabaseKey)
  }
  return supabaseClient
}
