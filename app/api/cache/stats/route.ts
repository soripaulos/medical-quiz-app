import { NextResponse } from "next/server"
import { questionCache } from "@/lib/cache/question-cache"

export async function GET() {
  try {
    const stats = questionCache.getStats()
    
    return NextResponse.json({
      cache: stats,
      performance: {
        cacheSize: stats.size,
        activeKeys: stats.keys.length,
        keyTypes: {
          years: stats.keys.filter(k => k.includes('years')).length,
          filterOptions: stats.keys.filter(k => k.includes('filter_options')).length,
          filteredQuestions: stats.keys.filter(k => k.includes('filtered_questions')).length,
          specialtyIds: stats.keys.filter(k => k.includes('specialty_ids')).length,
          examTypeIds: stats.keys.filter(k => k.includes('exam_type_ids')).length,
          questionCount: stats.keys.filter(k => k.includes('question_count')).length
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      cache: { size: 0, keys: [] },
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}