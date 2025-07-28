import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin-client"

export async function POST(req: Request) {
  const payload = (await req.json()) as any

  const supabase = createAdminClient()

  try {
    // 1. get FK ids with better error handling
    let specialtyId = null
    let examTypeId = null

    if (payload.specialty && payload.specialty.trim()) {
      const { data: spec, error: specError } = await supabase
        .from("specialties")
        .select("id")
        .eq("name", payload.specialty.trim())
        .single()

      if (specError) {
        console.warn(`Specialty not found: ${payload.specialty}`)
      } else {
        specialtyId = spec?.id
      }
    }

    if (payload.examType && payload.examType.trim()) {
      const { data: exam, error: examError } = await supabase
        .from("exam_types")
        .select("id")
        .eq("name", payload.examType.trim())
        .single()

      if (examError) {
        console.warn(`Exam type not found: ${payload.examType}`)
      } else {
        examTypeId = exam?.id
      }
    }

    // 2. Prepare choice columns
    const choiceData: any = {}
    payload.answerChoices.forEach((choice: any) => {
      const columnName = `choice_${choice.letter.toLowerCase()}`
      choiceData[columnName] = choice.text
    })

    // 3. insert question with individual choice columns
    const { data: question, error: qErr } = await supabase
      .from("questions")
      .insert({
        question_text: payload.questionText,
        question_image_url: payload.questionImageUrl ?? null,
        explanation: payload.explanation,
        explanation_image_url: payload.explanationImageUrl ?? null,
        sources: payload.sources || null,
        year: payload.year ? Number(payload.year) : null,
        difficulty: payload.difficulty ? Number(payload.difficulty) : null,
        specialty_id: specialtyId,
        exam_type_id: examTypeId,
        correct_answer: payload.correctAnswer,
        ...choiceData,
      })
      .select()
      .single()

    if (qErr) throw qErr

    return NextResponse.json({ ok: true, question })
  } catch (err) {
    console.error("Admin insert error", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}

export async function GET(req: Request) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  
  // Parse query parameters for pagination and filtering
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const search = searchParams.get('search') || ''
  const specialty = searchParams.get('specialty') || ''
  const examType = searchParams.get('examType') || ''
  const difficulty = searchParams.get('difficulty') || ''
  const year = searchParams.get('year') || ''
  const loadAll = searchParams.get('loadAll') === 'true'

  try {
    // Build the base query
    let query = supabase
      .from("questions")
      .select(
        `
        *,
        specialty:specialties(id, name),
        exam_type:exam_types(id, name)
      `,
        { count: 'exact' }
      )

    // Apply server-side filtering for better performance
    if (search) {
      query = query.ilike('question_text', `%${search}%`)
    }

    if (specialty && specialty !== 'all') {
      // Get specialty ID first
      const { data: specialtyData, error: specialtyError } = await supabase
        .from("specialties")
        .select("id")
        .eq("name", specialty)
        .single()
      
      if (!specialtyError && specialtyData) {
        query = query.eq('specialty_id', (specialtyData as any).id)
      }
    }

    if (examType && examType !== 'all') {
      // Get exam type ID first
      const { data: examTypeData, error: examTypeError } = await supabase
        .from("exam_types")
        .select("id")
        .eq("name", examType)
        .single()
      
      if (!examTypeError && examTypeData) {
        query = query.eq('exam_type_id', (examTypeData as any).id)
      }
    }

    if (difficulty && difficulty !== 'all') {
      query = query.eq('difficulty', parseInt(difficulty))
    }

    if (year && year !== 'all') {
      query = query.eq('year', parseInt(year))
    }

    // Apply pagination unless loadAll is requested
    if (!loadAll) {
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)
    }

    // Order by created_at descending
    query = query.order("created_at", { ascending: false })

    const { data: questions, error, count } = await query

    if (error) {
      console.error("Database error:", error)
      throw error
    }

    return NextResponse.json({ 
      questions: questions || [],
      totalCount: count || 0,
      page,
      limit,
      totalPages: loadAll ? 1 : Math.ceil((count || 0) / limit),
      hasMore: loadAll ? false : (count || 0) > page * limit
    })
  } catch (err) {
    console.error("Error fetching questions:", err)
    return NextResponse.json({ 
      ok: false, 
      message: String(err),
      questions: [],
      totalCount: 0 
    }, { status: 500 })
  }
}
