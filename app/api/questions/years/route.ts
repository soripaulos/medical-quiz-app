import { NextResponse } from "next/server"
import { optimizedQueries } from "@/lib/supabase/connection-utils"

export async function GET() {
  try {
    const result = await optimizedQueries.getDistinctYears()
    
    return NextResponse.json({ 
      years: result.data,
      count: result.data.length,
      method: result.method
    })
  } catch (err) {
    console.error("Error fetching years:", err)
    return NextResponse.json({ 
      ok: false, 
      message: String(err),
      years: [],
      count: 0
    }, { status: 500 })
  }
}
