import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

let adminClient: ReturnType<typeof createClient> | null = null

export function createAdminClient() {
  // Handle missing environment variables during build
  if (!supabaseUrl || !supabaseServiceKey) {
    if (process.env.NODE_ENV === 'production' || process.env.CI) {
      throw new Error('Missing required Supabase environment variables')
    }
    // Return a mock client for build-time
    return {
      from: () => ({
        select: () => ({ 
          eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
          not: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
          order: () => Promise.resolve({ data: [], error: null }),
          range: () => Promise.resolve({ data: [], error: null, count: 0 }),
          single: () => Promise.resolve({ data: null, error: null })
        }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      }),
      rpc: () => Promise.resolve({ data: [], error: null })
    } as any
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return adminClient
}
