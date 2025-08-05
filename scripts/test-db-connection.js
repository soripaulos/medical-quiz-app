const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function testConnection() {
  console.log('Testing database connection...')
  
  try {
    // Test exam_types table
    const { data: examTypes, error: examTypesError } = await supabase
      .from('exam_types')
      .select('*')
      .limit(10)
    
    if (examTypesError) {
      console.error('Error fetching exam_types:', examTypesError)
    } else {
      console.log('✓ exam_types table accessible:', examTypes.length, 'records')
      console.log('  Sample data:', examTypes.map(et => et.name))
    }

    // Test specialties table
    const { data: specialties, error: specialtiesError } = await supabase
      .from('specialties')
      .select('*')
      .limit(10)
    
    if (specialtiesError) {
      console.error('Error fetching specialties:', specialtiesError)
    } else {
      console.log('✓ specialties table accessible:', specialties.length, 'records')
      console.log('  Sample data:', specialties.map(s => s.name))
    }

    // Test questions table and years
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('year')
      .not('year', 'is', null)
      .limit(20)
    
    if (questionsError) {
      console.error('Error fetching questions:', questionsError)
    } else {
      const years = [...new Set(questions.map(q => q.year))].sort((a, b) => b - a)
      console.log('✓ questions table accessible:', questions.length, 'records with years')
      console.log('  Available years:', years)
    }

    // Get total counts
    const counts = await Promise.all([
      supabase.from('exam_types').select('*', { count: 'exact', head: true }),
      supabase.from('specialties').select('*', { count: 'exact', head: true }),
      supabase.from('questions').select('*', { count: 'exact', head: true })
    ])

    console.log('\nTable counts:')
    console.log('  exam_types:', counts[0].count)
    console.log('  specialties:', counts[1].count)
    console.log('  questions:', counts[2].count)

  } catch (error) {
    console.error('Connection test failed:', error)
  }
}

async function ensureSampleData() {
  console.log('\nChecking for sample data...')
  
  // Ensure we have some exam types
  const { data: existingExamTypes } = await supabase
    .from('exam_types')
    .select('name')
  
  const examTypeNames = existingExamTypes?.map(et => et.name) || []
  const requiredExamTypes = ['Exit Exam', 'COC', 'USMLE Step 1', 'USMLE Step 2', 'COMLEX Level 1']
  
  for (const examType of requiredExamTypes) {
    if (!examTypeNames.includes(examType)) {
      console.log(`Adding exam type: ${examType}`)
      const { error } = await supabase
        .from('exam_types')
        .insert({ name: examType })
      
      if (error && !error.message.includes('duplicate')) {
        console.error(`Error adding exam type ${examType}:`, error)
      }
    }
  }

  // Ensure we have some specialties
  const { data: existingSpecialties } = await supabase
    .from('specialties')
    .select('name')
  
  const specialtyNames = existingSpecialties?.map(s => s.name) || []
  const requiredSpecialties = [
    'Internal Medicine', 'Surgery', 'Pediatrics', 'OB/GYN', 
    'Public Health', 'Minor Specialties', 'Emergency Medicine',
    'Family Medicine', 'Psychiatry', 'Radiology'
  ]
  
  for (const specialty of requiredSpecialties) {
    if (!specialtyNames.includes(specialty)) {
      console.log(`Adding specialty: ${specialty}`)
      const { error } = await supabase
        .from('specialties')
        .insert({ name: specialty })
      
      if (error && !error.message.includes('duplicate')) {
        console.error(`Error adding specialty ${specialty}:`, error)
      }
    }
  }
}

async function main() {
  await testConnection()
  await ensureSampleData()
  console.log('\nDatabase test completed!')
}

main().catch(console.error)