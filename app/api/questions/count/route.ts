import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const { filters } = await req.json()

  const supabase = await createClient()

  try {
    // Try to use the optimized SQL function first
    try {
      const { data: count, error: rpcError } = await supabase
        .rpc('count_questions_with_filters', {
          specialty_names: filters.specialties?.length > 0 ? filters.specialties : null,
          exam_type_names: filters.examTypes?.length > 0 ? filters.examTypes : null,
          years: filters.years?.length > 0 ? filters.years : null,
          difficulties: filters.difficulties?.length > 0 ? filters.difficulties : null,
        })

      if (!rpcError && count !== null) {
        return NextResponse.json({ count: count || 0 })
      }
      
      console.warn("RPC count_questions_with_filters failed, falling back to regular query:", rpcError)
    } catch (rpcErr) {
      console.warn("RPC count_questions_with_filters not available, falling back to regular query:", rpcErr)
    }

    // Fallback to the original method if RPC fails
    let countQuery = supabase.from("questions").select("id", { count: "exact", head: true })

    // Apply specialty filters - if empty array, include all
    if (filters.specialties && filters.specialties.length > 0) {
      const { data: specialtyIds } = await supabase
        .from("specialties")
        .select("id")
        .in("name", filters.specialties)
        .range(0, 999) // Ensure we get all matching specialties

      if (specialtyIds && specialtyIds.length > 0) {
        countQuery = countQuery.in(
          "specialty_id",
          specialtyIds.map((s) => s.id),
        )
      }
    }

    // Apply exam type filters - if empty array, include all
    if (filters.examTypes && filters.examTypes.length > 0) {
      const { data: examTypeIds } = await supabase
        .from("exam_types")
        .select("id")
        .in("name", filters.examTypes)
        .range(0, 999) // Ensure we get all matching exam types

      if (examTypeIds && examTypeIds.length > 0) {
        countQuery = countQuery.in(
          "exam_type_id",
          examTypeIds.map((e) => e.id),
        )
      }
    }

    // Apply year filters - if empty array, include all
    if (filters.years && filters.years.length > 0) {
      countQuery = countQuery.in("year", filters.years)
    }

    // Apply difficulty filters - if empty array, include all
    if (filters.difficulties && filters.difficulties.length > 0) {
      countQuery = countQuery.in("difficulty", filters.difficulties)
    }

    const { count, error } = await countQuery

    if (error) throw error

    return NextResponse.json({ count: count || 0 })
  } catch (err) {
    console.error("Error counting questions:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}