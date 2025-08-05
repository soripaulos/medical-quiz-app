import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

let adminClient: ReturnType<typeof createClient> | null = null

export function createAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase admin environment variables:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlLength: supabaseUrl?.length || 0,
      serviceKeyLength: supabaseServiceKey?.length || 0
    })
    throw new Error("Supabase admin environment variables not configured")
  }

  if (!adminClient) {
    console.log("Creating Supabase admin client...")
    adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return adminClient
}
