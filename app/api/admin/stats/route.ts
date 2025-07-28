import { NextResponse } from "next/server"
import { optimizedQueries } from "@/lib/supabase/connection-utils"

export async function GET() {
  try {
    const totalQuestions = await optimizedQueries.getTotalQuestionCount()

    return NextResponse.json({ totalQuestions })
  } catch (error) {
    console.error("Error fetching total questions:", error)
    return NextResponse.json({ 
      error: "Failed to fetch total questions",
      totalQuestions: 0 
    }, { status: 500 })
  }
}
