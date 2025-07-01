import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: specialties, error } = await supabase.from("specialties").select("*").order("name")

    if (error) throw error

    return NextResponse.json({ specialties })
  } catch (err) {
    console.error("Error fetching specialties:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
