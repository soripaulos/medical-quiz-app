import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin-client"

export async function GET() {
  try {
    const supabase = createAdminClient()
    
    // Simple direct query to get distinct years
    const { data: questions, error } = await supabase
      .from('questions')
      .select('year')
      .not('year', 'is', null)
      .order('year', { ascending: false })
    
    if (error) {
      console.error('Database error:', error)
      // Return a reasonable range of years as fallback
      const currentYear = new Date().getFullYear()
      const fallbackYears = []
      for (let year = currentYear + 1; year >= currentYear - 20; year--) {
        fallbackYears.push(year)
      }
      
      return NextResponse.json({ 
        years: fallbackYears,
        count: fallbackYears.length,
        method: 'fallback'
      })
    }
    
    // Extract unique years and sort them
    const uniqueYears = [...new Set(
      questions?.map((q: any) => q.year).filter((year: any) => 
        year !== null && year !== undefined && typeof year === 'number'
      )
    )] as number[]
    
    const sortedYears = uniqueYears.sort((a: number, b: number) => b - a)
    
    return NextResponse.json({ 
      years: sortedYears,
      count: sortedYears.length,
      method: 'direct'
    })
    
  } catch (err) {
    console.error("Error fetching years:", err)
    
    // Return a reasonable range of years as fallback
    const currentYear = new Date().getFullYear()
    const fallbackYears = []
    for (let year = currentYear + 1; year >= currentYear - 20; year--) {
      fallbackYears.push(year)
    }
    
    return NextResponse.json({ 
      years: fallbackYears,
      count: fallbackYears.length,
      method: 'error_fallback'
    })
  }
}
