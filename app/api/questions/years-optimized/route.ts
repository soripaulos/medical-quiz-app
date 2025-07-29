import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin-client"
import { enhancedQuestionCache } from "@/lib/cache/enhanced-question-cache"

interface YearResponse {
  years: number[]
  count: number
  method: string
  cached?: boolean
  responseTime?: string
  stats?: any
  error?: string
}

export async function GET() {
  const startTime = Date.now()
  
  try {
    // Check enhanced cache first (fastest path)
    const cachedYears = enhancedQuestionCache.getYears()
    if (cachedYears && cachedYears.length > 0) {
      const responseTime = Date.now() - startTime
      return NextResponse.json({ 
        years: cachedYears,
        count: cachedYears.length,
        method: 'enhanced_cache',
        cached: true,
        responseTime: `${responseTime}ms`
      } as YearResponse)
    }

    const supabase = createAdminClient()
    
    // Try the new optimized RPC function first
    try {
      const { data: yearStats, error: statsError } = await supabase.rpc('get_years_with_stats')
      
      if (!statsError && yearStats && Array.isArray(yearStats) && yearStats.length > 0) {
        const years = yearStats.map((stat: any) => stat.year).sort((a: number, b: number) => b - a)
        
        // Cache both years and stats for future use
        enhancedQuestionCache.setYears(years)
        enhancedQuestionCache.setYearStats(yearStats)
        
        const responseTime = Date.now() - startTime
        return NextResponse.json({ 
          years,
          count: years.length,
          method: 'rpc_with_stats',
          cached: false,
          responseTime: `${responseTime}ms`,
          stats: {
            totalQuestions: yearStats.reduce((sum: number, stat: any) => sum + stat.question_count, 0),
            yearRange: `${Math.min(...years)}-${Math.max(...years)}`,
            avgQuestionsPerYear: Math.round(yearStats.reduce((sum: number, stat: any) => sum + stat.question_count, 0) / years.length)
          }
        } as YearResponse)
      }
    } catch (rpcErr) {
      console.warn('Enhanced RPC function not available, trying fallback:', rpcErr)
    }
    
    // Try the basic RPC function
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_distinct_years')
      
      if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        const sortedYears = rpcData.sort((a: number, b: number) => b - a)
        
        // Cache the result
        enhancedQuestionCache.setYears(sortedYears)
        
        const responseTime = Date.now() - startTime
        return NextResponse.json({ 
          years: sortedYears,
          count: sortedYears.length,
          method: 'rpc_basic',
          cached: false,
          responseTime: `${responseTime}ms`
        } as YearResponse)
      }
    } catch (rpcErr) {
      console.warn('Basic RPC function not available, using direct query:', rpcErr)
    }
    
    // Direct query approach with optimization
    const { data: questions, error } = await supabase
      .from('questions')
      .select('year')
      .not('year', 'is', null)
      .order('year', { ascending: false })
    
    if (error) {
      console.error('Database error:', error)
      
      // Try to get from cache as fallback
      const cachedFallbackYears = enhancedQuestionCache.getYears()
      if (cachedFallbackYears && cachedFallbackYears.length > 0) {
        const responseTime = Date.now() - startTime
        return NextResponse.json({ 
          years: cachedFallbackYears,
          count: cachedFallbackYears.length,
          method: 'cache_fallback',
          cached: true,
          responseTime: `${responseTime}ms`,
          error: error.message
        } as YearResponse)
      }
      
      // Return comprehensive fallback years based on realistic medical exam history
      const fallbackYears = generateFallbackYears()
      
      // Cache fallback for short duration
      enhancedQuestionCache.setYears(fallbackYears)
      
      const responseTime = Date.now() - startTime
      return NextResponse.json({ 
        years: fallbackYears,
        count: fallbackYears.length,
        method: 'fallback_error',
        cached: false,
        responseTime: `${responseTime}ms`,
        error: error.message
      } as YearResponse)
    }
    
    // Extract unique years and sort them
    const uniqueYears = [...new Set(
      questions?.map((q: any) => q.year).filter((year: any) => 
        year !== null && 
        year !== undefined && 
        typeof year === 'number' &&
        year >= 1990 && // Reasonable lower bound
        year <= new Date().getFullYear() + 5 // Allow future years
      )
    )] as number[]
    
    const sortedYears = uniqueYears.sort((a: number, b: number) => b - a)
    
    // If we got no years from database, use comprehensive fallback
    if (sortedYears.length === 0) {
      const fallbackYears = generateFallbackYears()
      
      // Cache fallback
      enhancedQuestionCache.setYears(fallbackYears)
      
      const responseTime = Date.now() - startTime
      return NextResponse.json({ 
        years: fallbackYears,
        count: fallbackYears.length,
        method: 'fallback_empty_result',
        cached: false,
        responseTime: `${responseTime}ms`
      } as YearResponse)
    }
    
    // Cache the successful result
    enhancedQuestionCache.setYears(sortedYears)
    
    const responseTime = Date.now() - startTime
    return NextResponse.json({ 
      years: sortedYears,
      count: sortedYears.length,
      method: 'direct_query',
      cached: false,
      responseTime: `${responseTime}ms`,
      stats: {
        totalQuestions: questions?.length || 0,
        yearRange: sortedYears.length > 0 ? `${Math.min(...sortedYears)}-${Math.max(...sortedYears)}` : 'none'
      }
    } as YearResponse)
    
  } catch (err) {
    console.error("Error fetching years:", err)
    
    // Check if we have any cached data as last resort
    const cachedYears = enhancedQuestionCache.getYears()
    if (cachedYears && cachedYears.length > 0) {
      const responseTime = Date.now() - startTime
      return NextResponse.json({ 
        years: cachedYears,
        count: cachedYears.length,
        method: 'cache_error_fallback',
        cached: true,
        responseTime: `${responseTime}ms`,
        error: String(err)
      } as YearResponse)
    }
    
    // Return comprehensive fallback for all possible years
    const fallbackYears = generateFallbackYears()
    
    // Cache fallback for short duration
    enhancedQuestionCache.setYears(fallbackYears)
    
    const responseTime = Date.now() - startTime
    return NextResponse.json({ 
      years: fallbackYears,
      count: fallbackYears.length,
      method: 'fallback_complete_error',
      cached: false,
      responseTime: `${responseTime}ms`,
      error: String(err)
    } as YearResponse)
  }
}

// Generate realistic fallback years for medical exams
function generateFallbackYears(): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  
  // Generate years from current year down to 1990 (reasonable range for medical exams)
  for (let year = currentYear + 2; year >= 1990; year--) {
    years.push(year)
  }
  
  return years
}

// Health check endpoint
export async function HEAD() {
  try {
    const cachedYears = enhancedQuestionCache.getYears()
    const cacheStats = enhancedQuestionCache.getStats()
    
    return new Response(null, {
      status: 200,
      headers: {
        'X-Cache-Hit': cachedYears ? 'true' : 'false',
        'X-Cache-Size': cacheStats.size.toString(),
        'X-Cache-Hit-Rate': (cacheStats.hitRate * 100).toFixed(2),
        'X-Years-Count': cachedYears?.length?.toString() || '0'
      }
    })
  } catch (error) {
    return new Response(null, { status: 500 })
  }
}