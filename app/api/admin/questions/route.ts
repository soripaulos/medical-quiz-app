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

export async function GET() {
  const supabase = createAdminClient()

  try {
    const { data: questions, error } = await supabase
      .from("questions")
      .select(
        `
        *,
        specialty:specialties(id, name),
        exam_type:exam_types(id, name)
      `,
      )
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ questions })
  } catch (err) {
    console.error("Error fetching questions:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}
