import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin-client"

export async function GET() {
  try {
    const supabase = createAdminClient()
    
    // Direct query approach for maximum compatibility
    const { data: questions, error } = await supabase
      .from('questions')
      .select('year')
      .not('year', 'is', null)
      .order('year', { ascending: false })
    
    if (error) {
      console.error('Database error:', error)
      // Return fallback years if database query fails
      const fallbackYears = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010]
      return NextResponse.json({ 
        years: fallbackYears,
        count: fallbackYears.length,
        method: 'fallback_static',
        error: error.message
      })
    }
    
    // Extract unique years and sort them
    const uniqueYears = [...new Set(
      questions?.map((q: any) => q.year).filter((year: any) => year !== null && year !== undefined)
    )] as number[]
    
    const sortedYears = uniqueYears.sort((a: number, b: number) => b - a)
    
    // If we got no years from database, use fallback
    if (sortedYears.length === 0) {
      const fallbackYears = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010]
      return NextResponse.json({ 
        years: fallbackYears,
        count: fallbackYears.length,
        method: 'fallback_empty_result'
      })
    }
    
    return NextResponse.json({ 
      years: sortedYears,
      count: sortedYears.length,
      method: 'direct_query'
    })
    
  } catch (err) {
    console.error("Error fetching years:", err)
    
    // Return a comprehensive fallback for all possible years
    const fallbackYears = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 2005]
    
    return NextResponse.json({ 
      years: fallbackYears,
      count: fallbackYears.length,
      method: 'fallback_error',
      error: String(err)
    })
  }
}
