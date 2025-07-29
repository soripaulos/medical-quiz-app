import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // If no real database connection, return mock data for testing
    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_supabase') || supabaseKey.includes('your_')) {
      console.log('No real database connection, returning mock years')
      const mockYears = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010]
      return NextResponse.json({
        years: mockYears,
        count: mockYears.length,
        method: 'mock'
      })
    }

    // Create direct Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Simple query to get all years from questions
    const { data, error } = await supabase
      .from('questions')
      .select('year')
      .not('year', 'is', null)
    
    if (error) {
      console.error('Database error:', error)
      // Return fallback years
      const fallbackYears = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010]
      return NextResponse.json({
        years: fallbackYears,
        count: fallbackYears.length,
        method: 'fallback',
        error: error.message
      })
    }
    
    // Extract unique years
    const allYears = data?.map((item: any) => item.year) || []
    const uniqueYears = [...new Set(allYears)]
      .filter((year): year is number => typeof year === 'number' && year > 1990 && year <= 2030)
      .sort((a, b) => b - a)
    
    console.log(`Found ${uniqueYears.length} unique years from ${data?.length || 0} questions`)
    
    return NextResponse.json({
      years: uniqueYears,
      count: uniqueYears.length,
      method: 'database',
      totalQuestions: data?.length || 0
    })
    
  } catch (error) {
    console.error('Error in years-simple API:', error)
    
    // Return fallback years
    const fallbackYears = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010]
    return NextResponse.json({
      years: fallbackYears,
      count: fallbackYears.length,
      method: 'error_fallback',
      error: String(error)
    })
  }
}