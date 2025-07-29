import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin-client"

export async function GET() {
  try {
    // Use centralized admin client
    const supabase = createAdminClient()
    
    // Check if we have a valid connection
    if (!supabase) {
      console.log('No real database connection, returning mock filter options')
      
      return NextResponse.json({
        specialties: ["Internal Medicine", "Cardiology", "Neurology", "Surgery", "Pediatrics", "OB/GYN"],
        examTypes: ["USMLE Step 1", "USMLE Step 2", "USMLE Step 3", "NBME"],
        years: [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010],
        difficulties: [1, 2, 3, 4, 5],
        cached: false,
        method: 'mock'
      })
    }

    // Fetch all filter options in parallel
    const [specialtiesResult, examTypesResult, yearsResult, difficultiesResult] = await Promise.all([
      supabase.from("specialties").select("name").order("name"),
      supabase.from("exam_types").select("name").order("name"),
      supabase.from('questions').select('year').not('year', 'is', null),
      supabase.from("questions").select("difficulty").not("difficulty", "is", null)
    ])

    // Process specialties
    const specialties = specialtiesResult.data?.map((s: any) => s.name) || []
    
    // Process exam types
    const examTypes = examTypesResult.data?.map((e: any) => e.name) || []
    
    // Process years
    const allYears = yearsResult.data?.map((item: any) => item.year) || []
    const years = [...new Set(allYears)]
      .filter((year): year is number => typeof year === 'number' && year > 1990 && year <= 2030)
      .sort((a, b) => b - a)
    
    // Process difficulties
    const allDifficulties = difficultiesResult.data?.map((item: any) => item.difficulty) || []
    const difficulties = [...new Set(allDifficulties)]
      .filter((diff): diff is number => typeof diff === 'number' && diff >= 1 && diff <= 5)
      .sort((a, b) => a - b)

    const result = {
      specialties,
      examTypes,
      years,
      difficulties,
      cached: false,
      method: 'database'
    }

    console.log(`Filter options loaded: ${specialties.length} specialties, ${examTypes.length} exam types, ${years.length} years, ${difficulties.length} difficulties`)

    return NextResponse.json(result)

  } catch (error) {
    console.error("Error fetching filter options:", error)

    // Return fallback data
    return NextResponse.json({
      specialties: ["Internal Medicine", "Cardiology", "Neurology", "Surgery", "Pediatrics", "OB/GYN"],
      examTypes: ["USMLE Step 1", "USMLE Step 2", "USMLE Step 3", "NBME"],
      years: [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010],
      difficulties: [1, 2, 3, 4, 5],
      cached: false,
      method: 'fallback',
      error: String(error)
    })
  }
}