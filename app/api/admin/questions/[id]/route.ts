import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin-client"

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await context.params

  try {
    const { data: question, error } = await supabase
      .from("questions")
      .select(
        `
        *,
        specialty:specialties(id, name),
        exam_type:exam_types(id, name)
      `,
      )
      .eq("id", id)
      .single()

    if (error) throw error

    return NextResponse.json({ question })
  } catch (err) {
    console.error("Error fetching question:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 404 })
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const payload = (await req.json()) as any
  const supabase = createAdminClient()
  const { id } = await context.params

  try {
    // Get FK ids with better error handling
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

    // Prepare choice columns
    const choiceData: any = {}
    if (payload.answerChoices) {
      // Clear existing choices first
      choiceData.choice_a = null
      choiceData.choice_b = null
      choiceData.choice_c = null
      choiceData.choice_d = null
      choiceData.choice_e = null
      choiceData.choice_f = null

      payload.answerChoices.forEach((choice: any) => {
        const columnName = `choice_${choice.letter.toLowerCase()}`
        choiceData[columnName] = choice.text
      })
    }

    // Update question
    const { data: question, error: qErr } = await supabase
      .from("questions")
      .update({
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
      .eq("id", id)
      .select()
      .single()

    if (qErr) throw qErr

    return NextResponse.json({ ok: true, question })
  } catch (err) {
    console.error("Admin update error", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await context.params

  try {
    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Error deleting question:", err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 })
  }
}