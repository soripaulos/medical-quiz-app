import { NextRequest, NextResponse } from "next/server"
import { enhancedQuestionCache } from "@/lib/cache/enhanced-question-cache"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    switch (action) {
      case 'stats':
        const stats = enhancedQuestionCache.getStats()
        return NextResponse.json({
          success: true,
          stats: {
            ...stats,
            hitRatePercent: (stats.hitRate * 100).toFixed(2) + '%',
            missRatePercent: (stats.missRate * 100).toFixed(2) + '%'
          }
        })
        
      case 'years':
        const years = enhancedQuestionCache.getYears()
        const yearStats = enhancedQuestionCache.getYearStats()
        return NextResponse.json({
          success: true,
          data: {
            years,
            yearCount: years?.length || 0,
            yearStats,
            statsCount: yearStats?.length || 0
          }
        })
        
      case 'filter-options':
        const filterOptions = enhancedQuestionCache.getFilterOptions()
        return NextResponse.json({
          success: true,
          data: filterOptions
        })
        
      case 'warmup':
        await enhancedQuestionCache.warmup()
        return NextResponse.json({
          success: true,
          message: 'Cache warmup initiated'
        })
        
      default:
        return NextResponse.json({
          success: true,
          availableActions: ['stats', 'years', 'filter-options', 'warmup', 'clear', 'invalidate-years', 'invalidate-questions']
        })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    switch (action) {
      case 'clear':
        enhancedQuestionCache.clearAll()
        return NextResponse.json({
          success: true,
          message: 'Cache cleared successfully'
        })
        
      case 'invalidate-years':
        enhancedQuestionCache.invalidateYears()
        return NextResponse.json({
          success: true,
          message: 'Years cache invalidated'
        })
        
      case 'invalidate-questions':
        enhancedQuestionCache.invalidateQuestions()
        return NextResponse.json({
          success: true,
          message: 'Questions cache invalidated'
        })
        
      case 'cleanup':
        enhancedQuestionCache.cleanup()
        return NextResponse.json({
          success: true,
          message: 'Cache cleanup completed'
        })
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    enhancedQuestionCache.clearAll()
    return NextResponse.json({
      success: true,
      message: 'All cache data cleared'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}