#!/usr/bin/env node

// Simple script to test database years directly
// This helps debug if the issue is in the database or the API

const { createClient } = require('@supabase/supabase-js')

async function testDatabase() {
  // You'll need to set these environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('🔍 Testing database years directly...\n')

  try {
    // Test 1: Get all years (with limit to avoid timeout)
    console.log('1. Getting all years from questions table (first 100 rows):')
    const { data: allQuestions, error: allError } = await supabase
      .from('questions')
      .select('year')
      .range(0, 99)

    if (allError) {
      console.error('❌ Error fetching questions:', allError)
    } else {
      console.log(`✅ Fetched ${allQuestions.length} questions`)
      const years = allQuestions.map(q => q.year).filter(Boolean)
      const uniqueYears = [...new Set(years)].sort((a, b) => b - a)
      console.log('Years found:', uniqueYears)
    }

    // Test 2: Get distinct years using raw query
    console.log('\n2. Getting distinct years with NOT NULL filter:')
    const { data: distinctQuestions, error: distinctError } = await supabase
      .from('questions')
      .select('year')
      .not('year', 'is', null)
      .range(0, 999)

    if (distinctError) {
      console.error('❌ Error fetching distinct years:', distinctError)
    } else {
      console.log(`✅ Fetched ${distinctQuestions.length} questions with non-null years`)
      const years = distinctQuestions.map(q => q.year)
      const uniqueYears = [...new Set(years)].sort((a, b) => b - a)
      console.log('Distinct years:', uniqueYears)
      console.log('Year types:', uniqueYears.map(y => `${y} (${typeof y})`))
    }

    // Test 3: Count questions by year
    console.log('\n3. Counting questions by year:')
    const { data: yearCounts, error: countError } = await supabase
      .from('questions')
      .select('year')
      .not('year', 'is', null)
      .range(0, 999)

    if (countError) {
      console.error('❌ Error counting by year:', countError)
    } else {
      const yearCountMap = {}
      yearCounts.forEach(q => {
        const year = q.year
        yearCountMap[year] = (yearCountMap[year] || 0) + 1
      })
      
      console.log('Questions per year:')
      Object.keys(yearCountMap)
        .sort((a, b) => b - a)
        .forEach(year => {
          console.log(`  ${year}: ${yearCountMap[year]} questions`)
        })
    }

    // Test 4: Try the RPC function if it exists
    console.log('\n4. Testing RPC function get_distinct_years:')
    try {
      const { data: rpcYears, error: rpcError } = await supabase
        .rpc('get_distinct_years')

      if (rpcError) {
        console.log('⚠️  RPC function not available:', rpcError.message)
      } else {
        console.log('✅ RPC function works!')
        console.log('RPC years:', rpcYears)
      }
    } catch (rpcErr) {
      console.log('⚠️  RPC function error:', rpcErr.message)
    }

  } catch (error) {
    console.error('❌ General error:', error)
  }

  console.log('\n🏁 Database test completed!')
}

// Only run if this file is executed directly
if (require.main === module) {
  testDatabase().catch(console.error)
}

module.exports = { testDatabase }