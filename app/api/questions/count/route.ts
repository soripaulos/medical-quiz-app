import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const { filters } = await req.json()

  const supabase = await createClient()

  try {
    console.log("Counting questions with filters:", filters)

    // Try to use the optimized SQL function first
    try {
      console.log("Attempting RPC function count_questions_with_filters...")
      const { data: count, error: rpcError } = await supabase
        .rpc('count_questions_with_filters', {
          specialty_names: filters.specialties?.length > 0 ? filters.specialties : null,
          exam_type_names: filters.examTypes?.length > 0 ? filters.examTypes : null,
          years: filters.years?.length > 0 ? filters.years : null,
          difficulties: filters.difficulties?.length > 0 ? filters.difficulties : null,
        })

      if (!rpcError && count !== null) {
        console.log(`RPC function succeeded, count: ${count}`)
        return NextResponse.json({ count: count || 0 })
      }
      
      console.warn("RPC count_questions_with_filters failed, falling back to regular query:", rpcError)
    } catch (rpcErr) {
      console.warn("RPC count_questions_with_filters not available, falling back to regular query:", rpcErr)
    }

    // Fallback to the original method if RPC fails
    console.log("Using fallback count method...")
    let countQuery = supabase.from("questions").select("id", { count: "exact", head: true })

    // Apply specialty filters - if empty array, include all
    if (filters.specialties && filters.specialties.length > 0) {
      console.log("Applying specialty filters:", filters.specialties)
      const { data: specialtyIds, error: specialtyError } = await supabase
        .from("specialties")
        .select("id")
        .in("name", filters.specialties)
        .range(0, 999) // Ensure we get all matching specialties

      if (specialtyError) {
        console.error("Error fetching specialty IDs:", specialtyError)
        throw specialtyError
      }

      if (specialtyIds && specialtyIds.length > 0) {
        countQuery = countQuery.in(
          "specialty_id",
          specialtyIds.map((s) => s.id),
        )
        console.log(`Applied ${specialtyIds.length} specialty filters`)
      }
    }

    // Apply exam type filters - if empty array, include all
    if (filters.examTypes && filters.examTypes.length > 0) {
      console.log("Applying exam type filters:", filters.examTypes)
      const { data: examTypeIds, error: examTypeError } = await supabase
        .from("exam_types")
        .select("id")
        .in("name", filters.examTypes)
        .range(0, 999) // Ensure we get all matching exam types

      if (examTypeError) {
        console.error("Error fetching exam type IDs:", examTypeError)
        throw examTypeError
      }

      if (examTypeIds && examTypeIds.length > 0) {
        countQuery = countQuery.in(
          "exam_type_id",
          examTypeIds.map((e) => e.id),
        )
        console.log(`Applied ${examTypeIds.length} exam type filters`)
      }
    }

    // Apply year filters - if empty array, include all
    if (filters.years && filters.years.length > 0) {
      console.log("Applying year filters:", filters.years)
      countQuery = countQuery.in("year", filters.years)
    }

    // Apply difficulty filters - if empty array, include all
    if (filters.difficulties && filters.difficulties.length > 0) {
      console.log("Applying difficulty filters:", filters.difficulties)
      countQuery = countQuery.in("difficulty", filters.difficulties)
    }

    console.log("Executing count query...")
    const { count, error } = await countQuery

    if (error) {
      console.error("Count query error:", error)
      throw error
    }

    console.log(`Count query succeeded, result: ${count}`)
    return NextResponse.json({ count: count || 0 })
  } catch (err) {
    console.error("Error counting questions:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}