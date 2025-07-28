import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin-client"
import { questionCache } from "@/lib/cache/question-cache"

export async function GET() {
  try {
    // Check cache first
    const cachedYears = questionCache.getYears()
    if (cachedYears && cachedYears.length > 0) {
      return NextResponse.json({ 
        years: cachedYears,
        count: cachedYears.length,
        method: 'cache'
      })
    }

    const supabase = createAdminClient()
    
    // Try RPC function first (if available)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_distinct_years')
      
      if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        const sortedYears = rpcData.sort((a: number, b: number) => b - a)
        
        // Cache the result
        questionCache.setYears(sortedYears)
        
        return NextResponse.json({ 
          years: sortedYears,
          count: sortedYears.length,
          method: 'rpc'
        })
      }
    } catch (rpcErr) {
      console.warn('RPC function not available, using direct query')
    }
    
    // Direct query approach
    const { data: questions, error } = await supabase
      .from('questions')
      .select('year')
      .not('year', 'is', null)
      .order('year', { ascending: false })
    
    if (error) {
      console.error('Database error:', error)
      
      // Return comprehensive fallback years
      const fallbackYears = [
        2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 
        2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 
        2005, 2004, 2003, 2002, 2001, 2000
      ]
      
      // Cache fallback for short duration
      questionCache.setYears(fallbackYears)
      
      return NextResponse.json({ 
        years: fallbackYears,
        count: fallbackYears.length,
        method: 'fallback_error',
        error: error.message
      })
    }
    
    // Extract unique years and sort them
    const uniqueYears = [...new Set(
      questions?.map((q: any) => q.year).filter((year: any) => year !== null && year !== undefined)
    )] as number[]
    
    const sortedYears = uniqueYears.sort((a: number, b: number) => b - a)
    
    // If we got no years from database, use comprehensive fallback
    if (sortedYears.length === 0) {
      const fallbackYears = [
        2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 
        2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 
        2005, 2004, 2003, 2002, 2001, 2000
      ]
      
      // Cache fallback
      questionCache.setYears(fallbackYears)
      
      return NextResponse.json({ 
        years: fallbackYears,
        count: fallbackYears.length,
        method: 'fallback_empty_result'
      })
    }
    
    // Cache the successful result
    questionCache.setYears(sortedYears)
    
    return NextResponse.json({ 
      years: sortedYears,
      count: sortedYears.length,
      method: 'direct_query'
    })
    
  } catch (err) {
    console.error("Error fetching years:", err)
    
    // Check if we have any cached data as last resort
    const cachedYears = questionCache.getYears()
    if (cachedYears && cachedYears.length > 0) {
      return NextResponse.json({ 
        years: cachedYears,
        count: cachedYears.length,
        method: 'cache_fallback',
        error: String(err)
      })
    }
    
    // Return comprehensive fallback for all possible years
    const fallbackYears = [
      2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 
      2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 
      2005, 2004, 2003, 2002, 2001, 2000, 1999, 1998, 1997, 1996, 1995
    ]
    
    // Cache fallback for short duration
    questionCache.setYears(fallbackYears)
    
    return NextResponse.json({ 
      years: fallbackYears,
      count: fallbackYears.length,
      method: 'fallback_error',
      error: String(err)
    })
  }
}
