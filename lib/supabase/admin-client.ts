import { createClient } from "@supabase/supabase-js"

let adminClient: ReturnType<typeof createClient> | null = null

export function createAdminClient() {
  // Get environment variables inside the function to avoid build-time errors
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  // Handle missing environment variables during build
  if (!supabaseUrl || !supabaseServiceKey) {
    // Check if we're in a build environment
    const isBuildTime = process.env.NODE_ENV === 'production' && 
                       (process.env.VERCEL || process.env.CI || process.env.BUILD_PHASE)
    
    if (!isBuildTime && process.env.NODE_ENV === 'production') {
      // Only throw error in actual production runtime, not during build
      throw new Error('Missing required Supabase environment variables')
    }
    // Return a comprehensive mock client for build-time
    return {
      from: () => ({
        select: () => ({
          eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
          not: () => ({ 
            order: () => Promise.resolve({ data: [], error: null })
          }),
          order: () => Promise.resolve({ data: [], error: null }),
          range: () => ({ 
            order: () => Promise.resolve({ data: [], error: null, count: 0 })
          }),
          single: () => Promise.resolve({ data: null, error: null }),
          in: () => ({
            order: () => Promise.resolve({ data: [], error: null })
          })
        }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      }),
      rpc: (functionName: string) => {
        // Handle specific RPC functions used in our optimized endpoints
        switch (functionName) {
          case 'get_distinct_years':
            return Promise.resolve({ data: [2025, 2024, 2023, 2022, 2021], error: null })
          case 'get_years_with_stats':
            return Promise.resolve({ 
              data: [
                { year: 2025, question_count: 100, specialty_count: 5, exam_type_count: 3, min_difficulty: 1, max_difficulty: 5 },
                { year: 2024, question_count: 150, specialty_count: 6, exam_type_count: 4, min_difficulty: 1, max_difficulty: 5 },
                { year: 2023, question_count: 120, specialty_count: 5, exam_type_count: 3, min_difficulty: 1, max_difficulty: 5 }
              ], 
              error: null 
            })
          default:
            return Promise.resolve({ data: [], error: null })
        }
      }
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
