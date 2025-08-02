import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifySession } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    // Authenticate user (you might want to add admin role check here)
    const session = await verifySession()
    
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Sample specialties
    const specialties = [
      { id: 'cardiology', name: 'Cardiology', description: 'Heart and cardiovascular system' },
      { id: 'neurology', name: 'Neurology', description: 'Brain and nervous system' },
      { id: 'internal-medicine', name: 'Internal Medicine', description: 'General internal medicine' },
      { id: 'surgery', name: 'Surgery', description: 'General surgery' },
      { id: 'pediatrics', name: 'Pediatrics', description: 'Children\'s medicine' },
      { id: 'psychiatry', name: 'Psychiatry', description: 'Mental health' }
    ]

    // Sample exam types
    const examTypes = [
      { id: 'usmle-step1', name: 'USMLE Step 1', description: 'United States Medical Licensing Examination Step 1' },
      { id: 'usmle-step2', name: 'USMLE Step 2', description: 'United States Medical Licensing Examination Step 2' },
      { id: 'usmle-step3', name: 'USMLE Step 3', description: 'United States Medical Licensing Examination Step 3' },
      { id: 'nbme', name: 'NBME', description: 'National Board of Medical Examiners' },
      { id: 'shelf', name: 'Shelf Exam', description: 'NBME Subject Examinations' }
    ]

    // Sample questions
    const questions = [
      {
        id: 'q1-cardiology-basic',
        question_text: 'A 45-year-old man presents with chest pain that occurs with exertion and is relieved by rest. What is the most likely diagnosis?',
        choice_a: 'Myocardial infarction',
        choice_b: 'Stable angina',
        choice_c: 'Unstable angina',
        choice_d: 'Costochondritis',
        choice_e: 'Pulmonary embolism',
        correct_answer: 'B',
        explanation: 'Stable angina is characterized by chest pain that occurs predictably with exertion and is relieved by rest. This is due to fixed coronary artery stenosis that limits blood flow during increased cardiac demand.',
        sources: 'Harrison\'s Principles of Internal Medicine, 21st Edition',
        difficulty: 1,
        year: 2023,
        specialty_id: 'cardiology',
        exam_type_id: 'usmle-step1'
      },
      {
        id: 'q2-neurology-basic',
        question_text: 'A 65-year-old woman presents with sudden onset of weakness on the right side of her body and difficulty speaking. What is the most likely diagnosis?',
        choice_a: 'Migraine',
        choice_b: 'Seizure',
        choice_c: 'Stroke',
        choice_d: 'Brain tumor',
        choice_e: 'Multiple sclerosis',
        correct_answer: 'C',
        explanation: 'Acute onset of focal neurological deficits (hemiparesis and aphasia) in an elderly patient is most consistent with stroke, particularly ischemic stroke.',
        sources: 'Adams and Victor\'s Principles of Neurology',
        difficulty: 2,
        year: 2023,
        specialty_id: 'neurology',
        exam_type_id: 'usmle-step2'
      },
      {
        id: 'q3-internal-medicine',
        question_text: 'A 55-year-old diabetic patient presents with fever, dysuria, and flank pain. Urinalysis shows WBC casts. What is the most appropriate initial treatment?',
        choice_a: 'Oral ciprofloxacin',
        choice_b: 'IV ceftriaxone',
        choice_c: 'Oral trimethoprim-sulfamethoxazole',
        choice_d: 'IV vancomycin',
        choice_e: 'Oral nitrofurantoin',
        correct_answer: 'B',
        explanation: 'This presentation is consistent with pyelonephritis in a diabetic patient. IV antibiotics like ceftriaxone are preferred for initial treatment of complicated UTI/pyelonephritis.',
        sources: 'Mandell, Douglas, and Bennett\'s Principles of Infectious Diseases',
        difficulty: 2,
        year: 2023,
        specialty_id: 'internal-medicine',
        exam_type_id: 'usmle-step2'
      },
      {
        id: 'q4-surgery-intermediate',
        question_text: 'A 35-year-old man presents with sudden onset of severe abdominal pain that radiates to his back. He has a history of alcohol use. Serum lipase is elevated. What is the most likely diagnosis?',
        choice_a: 'Peptic ulcer disease',
        choice_b: 'Acute pancreatitis',
        choice_c: 'Cholecystitis',
        choice_d: 'Appendicitis',
        choice_e: 'Bowel obstruction',
        correct_answer: 'B',
        explanation: 'Acute pancreatitis typically presents with severe epigastric pain radiating to the back, especially in patients with alcohol use history. Elevated lipase confirms the diagnosis.',
        sources: 'Sabiston Textbook of Surgery',
        difficulty: 2,
        year: 2023,
        specialty_id: 'surgery',
        exam_type_id: 'usmle-step2'
      },
      {
        id: 'q5-pediatrics-basic',
        question_text: 'A 2-year-old child presents with fever, cough, and difficulty breathing. Chest X-ray shows consolidation in the right lower lobe. What is the most likely causative organism?',
        choice_a: 'Respiratory syncytial virus',
        choice_b: 'Streptococcus pneumoniae',
        choice_c: 'Haemophilus influenzae',
        choice_d: 'Mycoplasma pneumoniae',
        choice_e: 'Chlamydia pneumoniae',
        correct_answer: 'B',
        explanation: 'Streptococcus pneumoniae is the most common cause of bacterial pneumonia in children, especially with lobar consolidation on chest X-ray.',
        sources: 'Nelson Textbook of Pediatrics',
        difficulty: 1,
        year: 2023,
        specialty_id: 'pediatrics',
        exam_type_id: 'usmle-step2'
      }
    ]

    let results = {
      specialties: { inserted: 0, errors: [] as string[] },
      examTypes: { inserted: 0, errors: [] as string[] },
      questions: { inserted: 0, errors: [] as string[] }
    }

    // Insert specialties
    console.log('Inserting specialties...')
    for (const specialty of specialties) {
      const { error } = await supabase
        .from('specialties')
        .upsert(specialty, { onConflict: 'id' })
      
      if (error) {
        console.error('Error inserting specialty:', specialty.id, error)
        results.specialties.errors.push(`${specialty.id}: ${error.message}`)
      } else {
        results.specialties.inserted++
      }
    }

    // Insert exam types
    console.log('Inserting exam types...')
    for (const examType of examTypes) {
      const { error } = await supabase
        .from('exam_types')
        .upsert(examType, { onConflict: 'id' })
      
      if (error) {
        console.error('Error inserting exam type:', examType.id, error)
        results.examTypes.errors.push(`${examType.id}: ${error.message}`)
      } else {
        results.examTypes.inserted++
      }
    }

    // Insert questions
    console.log('Inserting questions...')
    for (const question of questions) {
      const { error } = await supabase
        .from('questions')
        .upsert(question, { onConflict: 'id' })
      
      if (error) {
        console.error('Error inserting question:', question.id, error)
        results.questions.errors.push(`${question.id}: ${error.message}`)
      } else {
        results.questions.inserted++
      }
    }

    console.log('Sample data setup completed:', results)

    return NextResponse.json({
      ok: true,
      message: 'Sample data setup completed',
      results
    })

  } catch (err) {
    console.error('Error setting up sample data:', err)
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}