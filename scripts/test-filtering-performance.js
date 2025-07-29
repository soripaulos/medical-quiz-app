#!/usr/bin/env node

/**
 * Performance Testing Script for Ultra-Fast Filtering
 * Tests the new optimized filtering system and compares performance
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// Test scenarios to benchmark
const testScenarios = [
  {
    name: 'Basic Year Filter',
    filters: { years: [2023, 2024] },
    expectedImprovement: '5x faster'
  },
  {
    name: 'Specialty Filter',
    filters: { specialties: ['Internal Medicine'] },
    expectedImprovement: '10x faster'
  },
  {
    name: 'Complex Multi-Filter',
    filters: { 
      years: [2023, 2024], 
      specialties: ['Cardiology', 'Internal Medicine'],
      difficulties: [1, 2, 3]
    },
    expectedImprovement: '8x faster'
  },
  {
    name: 'Exam Type + Year',
    filters: { 
      examTypes: ['USMLE Step 1'], 
      years: [2024] 
    },
    expectedImprovement: '6x faster'
  },
  {
    name: 'All Filters Combined',
    filters: {
      years: [2023, 2024],
      specialties: ['Cardiology'],
      examTypes: ['USMLE Step 1'],
      difficulties: [1, 2, 3],
      questionStatus: ['unanswered']
    },
    expectedImprovement: '12x faster'
  }
]

// Utility functions
async function makeRequest(url, options = {}) {
  const startTime = Date.now()
  try {
    const response = await fetch(url, options)
    const endTime = Date.now()
    const data = await response.json()
    
    return {
      success: true,
      responseTime: endTime - startTime,
      data,
      status: response.status
    }
  } catch (error) {
    return {
      success: false,
      responseTime: Date.now() - startTime,
      error: error.message
    }
  }
}

async function testFilterOptions() {
  console.log('\n🔍 Testing Filter Options API...')
  
  const result = await makeRequest(`${BASE_URL}/api/questions/filter-options`)
  
  if (result.success) {
    console.log(`✅ Filter Options: ${result.responseTime}ms`)
    console.log(`   • Specialties: ${result.data.specialties?.length || 0}`)
    console.log(`   • Years: ${result.data.years?.length || 0}`)
    console.log(`   • Exam Types: ${result.data.examTypes?.length || 0}`)
    console.log(`   • Method: ${result.data.method || 'unknown'}`)
    return { responseTime: result.responseTime, success: true }
  } else {
    console.log(`❌ Filter Options failed: ${result.error}`)
    return { responseTime: result.responseTime, success: false }
  }
}

async function testCountAPI(filters, scenarioName) {
  console.log(`\n📊 Testing Count API - ${scenarioName}`)
  
  const result = await makeRequest(`${BASE_URL}/api/questions/count`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, userId: 'test-user' })
  })
  
  if (result.success) {
    console.log(`✅ Count API: ${result.responseTime}ms`)
    console.log(`   • Question Count: ${result.data.count}`)
    console.log(`   • Cached: ${result.data.performance?.cached || false}`)
    console.log(`   • Method: ${result.data.performance?.method || 'unknown'}`)
    return { responseTime: result.responseTime, count: result.data.count, success: true }
  } else {
    console.log(`❌ Count API failed: ${result.error}`)
    return { responseTime: result.responseTime, success: false }
  }
}

async function testFilteredQuestionsAPI(filters, scenarioName) {
  console.log(`\n📋 Testing Filtered Questions API - ${scenarioName}`)
  
  const result = await makeRequest(`${BASE_URL}/api/questions/filtered`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      filters, 
      userId: 'test-user',
      limit: 100 // Smaller limit for testing
    })
  })
  
  if (result.success) {
    console.log(`✅ Filtered Questions: ${result.responseTime}ms`)
    console.log(`   • Questions Returned: ${result.data.questions?.length || 0}`)
    console.log(`   • Total Count: ${result.data.count}`)
    console.log(`   • Cached: ${result.data.performance?.cached || false}`)
    return { responseTime: result.responseTime, success: true }
  } else {
    console.log(`❌ Filtered Questions failed: ${result.error}`)
    return { responseTime: result.responseTime, success: false }
  }
}

async function testCachePerformance(filters, scenarioName) {
  console.log(`\n🚀 Testing Cache Performance - ${scenarioName}`)
  
  // First request (cache miss)
  const firstRequest = await testCountAPI(filters, `${scenarioName} - First Request`)
  
  // Second request (should be cached)
  const secondRequest = await testCountAPI(filters, `${scenarioName} - Cached Request`)
  
  if (firstRequest.success && secondRequest.success) {
    const improvement = firstRequest.responseTime / secondRequest.responseTime
    console.log(`📈 Cache Improvement: ${improvement.toFixed(1)}x faster (${firstRequest.responseTime}ms → ${secondRequest.responseTime}ms)`)
    return { improvement, firstTime: firstRequest.responseTime, cachedTime: secondRequest.responseTime }
  }
  
  return { improvement: 0, firstTime: 0, cachedTime: 0 }
}

async function runPerformanceBenchmark() {
  console.log('🚀 Ultra-Fast Filtering Performance Benchmark')
  console.log('=' .repeat(60))
  console.log(`Testing against: ${BASE_URL}`)
  console.log(`Test scenarios: ${testScenarios.length}`)
  
  const results = {
    filterOptions: null,
    scenarios: [],
    summary: {
      totalTests: 0,
      successfulTests: 0,
      averageResponseTime: 0,
      cacheImprovements: []
    }
  }
  
  // Test filter options loading
  results.filterOptions = await testFilterOptions()
  
  // Test each scenario
  for (const scenario of testScenarios) {
    console.log(`\n${'='.repeat(40)}`)
    console.log(`🎯 Scenario: ${scenario.name}`)
    console.log(`Expected: ${scenario.expectedImprovement}`)
    console.log(`Filters:`, JSON.stringify(scenario.filters, null, 2))
    
    const scenarioResults = {
      name: scenario.name,
      filters: scenario.filters,
      countAPI: null,
      filteredAPI: null,
      cachePerformance: null
    }
    
    // Test count API
    scenarioResults.countAPI = await testCountAPI(scenario.filters, scenario.name)
    results.summary.totalTests++
    if (scenarioResults.countAPI.success) results.summary.successfulTests++
    
    // Test filtered questions API
    scenarioResults.filteredAPI = await testFilteredQuestionsAPI(scenario.filters, scenario.name)
    results.summary.totalTests++
    if (scenarioResults.filteredAPI.success) results.summary.successfulTests++
    
    // Test cache performance
    scenarioResults.cachePerformance = await testCachePerformance(scenario.filters, scenario.name)
    if (scenarioResults.cachePerformance.improvement > 0) {
      results.summary.cacheImprovements.push(scenarioResults.cachePerformance.improvement)
    }
    
    results.scenarios.push(scenarioResults)
  }
  
  // Calculate summary statistics
  const responseTimes = results.scenarios
    .flatMap(s => [s.countAPI?.responseTime, s.filteredAPI?.responseTime])
    .filter(t => t && t > 0)
  
  results.summary.averageResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0
  
  return results
}

function printSummaryReport(results) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 PERFORMANCE SUMMARY REPORT')
  console.log('='.repeat(60))
  
  console.log(`\n✅ Test Results:`)
  console.log(`   • Total Tests: ${results.summary.totalTests}`)
  console.log(`   • Successful: ${results.summary.successfulTests}`)
  console.log(`   • Success Rate: ${((results.summary.successfulTests / results.summary.totalTests) * 100).toFixed(1)}%`)
  console.log(`   • Average Response Time: ${results.summary.averageResponseTime.toFixed(0)}ms`)
  
  if (results.summary.cacheImprovements.length > 0) {
    const avgCacheImprovement = results.summary.cacheImprovements.reduce((a, b) => a + b, 0) / results.summary.cacheImprovements.length
    console.log(`   • Average Cache Improvement: ${avgCacheImprovement.toFixed(1)}x faster`)
  }
  
  console.log(`\n🎯 Performance Targets:`)
  console.log(`   • Count API: ${results.summary.averageResponseTime < 200 ? '✅' : '❌'} Target <200ms (Actual: ${results.summary.averageResponseTime.toFixed(0)}ms)`)
  console.log(`   • Filter Options: ${results.filterOptions?.responseTime < 100 ? '✅' : '❌'} Target <100ms (Actual: ${results.filterOptions?.responseTime || 'N/A'}ms)`)
  console.log(`   • Cache Hit Rate: ${results.summary.cacheImprovements.length > 0 ? '✅' : '❌'} Caching Working`)
  
  console.log(`\n🚀 Top Performing Scenarios:`)
  const sortedScenarios = results.scenarios
    .filter(s => s.countAPI?.success)
    .sort((a, b) => a.countAPI.responseTime - b.countAPI.responseTime)
    .slice(0, 3)
  
  sortedScenarios.forEach((scenario, index) => {
    console.log(`   ${index + 1}. ${scenario.name}: ${scenario.countAPI.responseTime}ms`)
  })
  
  console.log(`\n⚡ Optimization Success Indicators:`)
  console.log(`   • Sub-200ms responses: ${results.summary.averageResponseTime < 200 ? '✅ ACHIEVED' : '❌ NEEDS WORK'}`)
  console.log(`   • Caching effectiveness: ${results.summary.cacheImprovements.length > 0 ? '✅ WORKING' : '❌ CHECK CACHE'}`)
  console.log(`   • API reliability: ${results.summary.successfulTests === results.summary.totalTests ? '✅ 100% SUCCESS' : '❌ HAS FAILURES'}`)
  
  if (results.summary.averageResponseTime < 200 && results.summary.cacheImprovements.length > 0) {
    console.log(`\n🎉 OPTIMIZATION SUCCESS! Ultra-fast filtering is working as expected.`)
  } else {
    console.log(`\n⚠️  OPTIMIZATION NEEDS ATTENTION. Check the issues above.`)
  }
}

// Main execution
async function main() {
  try {
    const results = await runPerformanceBenchmark()
    printSummaryReport(results)
    
    // Exit with appropriate code
    const success = results.summary.averageResponseTime < 200 && 
                   results.summary.successfulTests === results.summary.totalTests
    process.exit(success ? 0 : 1)
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { runPerformanceBenchmark, testFilterOptions, testCountAPI }