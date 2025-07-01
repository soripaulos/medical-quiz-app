import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: examTypes, error } = await supabase.from("exam_types").select("*").order("name")

    if (error) throw error

    return NextResponse.json({ examTypes })
  } catch (err) {
    console.error("Error fetching exam types:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
