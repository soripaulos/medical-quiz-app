#!/usr/bin/env node

/**
 * Comprehensive testing script for years filter optimization
 * Tests database functions, API endpoints, caching, and performance
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ENDPOINTS = {
  years: '/api/questions/years',
  yearsOptimized: '/api/questions/years-optimized',
  filterOptions: '/api/questions/filter-options',
  cacheManage: '/api/cache/manage'
};

// Performance tracking
const performanceResults = {
  endpoints: {},
  cacheHitRates: {},
  responsesTimes: {},
  errors: []
};

async function makeRequest(url, options = {}) {
  const startTime = Date.now();
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const responseTime = Date.now() - startTime;
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data,
      responseTime,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

async function testEndpoint(name, url, expectedFields = []) {
  console.log(`\n🧪 Testing ${name}...`);
  
  const result = await makeRequest(url);
  
  if (!result.success) {
    console.error(`❌ ${name} failed:`, result.error || `Status ${result.status}`);
    performanceResults.errors.push(`${name}: ${result.error || 'Request failed'}`);
    return null;
  }
  
  console.log(`✅ ${name} succeeded in ${result.responseTime}ms`);
  
  // Validate expected fields
  for (const field of expectedFields) {
    if (!(field in result.data)) {
      console.warn(`⚠️  Missing expected field: ${field}`);
    }
  }
  
  // Track performance
  performanceResults.endpoints[name] = {
    responseTime: result.responseTime,
    status: result.status,
    cached: result.data.cached || false,
    method: result.data.method || 'unknown'
  };
  
  return result.data;
}

async function testYearsEndpoints() {
  console.log('\n📅 Testing Years Endpoints');
  console.log('=' .repeat(50));
  
  // Test original years endpoint
  const originalYears = await testEndpoint(
    'Original Years API',
    ENDPOINTS.years,
    ['years', 'count', 'method']
  );
  
  // Test optimized years endpoint
  const optimizedYears = await testEndpoint(
    'Optimized Years API',
    ENDPOINTS.yearsOptimized,
    ['years', 'count', 'method', 'responseTime']
  );
  
  // Compare results
  if (originalYears && optimizedYears) {
    console.log('\n📊 Comparison Results:');
    console.log(`Original: ${originalYears.count} years via ${originalYears.method}`);
    console.log(`Optimized: ${optimizedYears.count} years via ${optimizedYears.method}`);
    
    if (originalYears.count !== optimizedYears.count) {
      console.warn('⚠️  Year counts differ between endpoints!');
    }
    
    // Check for the persistent issue (only 3 years)
    if (optimizedYears.count <= 3) {
      console.error('🚨 PERSISTENT ISSUE: Still showing only 3 years or less!');
      console.log('Years found:', optimizedYears.years);
    } else {
      console.log(`✅ Issue resolved: Found ${optimizedYears.count} years`);
      console.log('Year range:', optimizedYears.years ? 
        `${Math.min(...optimizedYears.years)}-${Math.max(...optimizedYears.years)}` : 'none');
    }
  }
  
  return { originalYears, optimizedYears };
}

async function testCachePerformance() {
  console.log('\n🚀 Testing Cache Performance');
  console.log('=' .repeat(50));
  
  // Clear cache first
  await makeRequest(ENDPOINTS.cacheManage, {
    method: 'POST',
    body: JSON.stringify({ action: 'clear' })
  });
  
  console.log('Cache cleared, testing cold performance...');
  
  // Test cold performance (no cache)
  const coldResult = await testEndpoint('Cold Request', ENDPOINTS.yearsOptimized);
  
  // Test warm performance (with cache)
  const warmResult = await testEndpoint('Warm Request', ENDPOINTS.yearsOptimized);
  
  if (coldResult && warmResult) {
    const coldTime = performanceResults.endpoints['Cold Request'].responseTime;
    const warmTime = performanceResults.endpoints['Warm Request'].responseTime;
    const improvement = ((coldTime - warmTime) / coldTime * 100).toFixed(1);
    
    console.log(`\n📈 Performance Analysis:`);
    console.log(`Cold request: ${coldTime}ms (${coldResult.method})`);
    console.log(`Warm request: ${warmTime}ms (${warmResult.method})`);
    console.log(`Cache improvement: ${improvement}% faster`);
    
    if (warmResult.cached) {
      console.log('✅ Caching is working correctly');
    } else {
      console.warn('⚠️  Expected cached response but got fresh data');
    }
  }
}

async function testCacheManagement() {
  console.log('\n🔧 Testing Cache Management');
  console.log('=' .repeat(50));
  
  // Get cache stats
  const statsResult = await testEndpoint('Cache Stats', `${ENDPOINTS.cacheManage}?action=stats`);
  
  if (statsResult && statsResult.success) {
    console.log('Cache Statistics:');
    console.log(`- Size: ${statsResult.stats.size} entries`);
    console.log(`- Hit Rate: ${statsResult.stats.hitRatePercent}`);
    console.log(`- Miss Rate: ${statsResult.stats.missRatePercent}`);
  }
  
  // Test cache warmup
  const warmupResult = await testEndpoint('Cache Warmup', `${ENDPOINTS.cacheManage}?action=warmup`);
  
  // Get years from cache
  const cachedYearsResult = await testEndpoint('Cached Years', `${ENDPOINTS.cacheManage}?action=years`);
  
  if (cachedYearsResult && cachedYearsResult.success) {
    console.log(`Cached years: ${cachedYearsResult.data.yearCount} years`);
    if (cachedYearsResult.data.yearStats) {
      console.log(`Year statistics: ${cachedYearsResult.data.statsCount} entries`);
    }
  }
}

async function testFilterOptionsIntegration() {
  console.log('\n🔍 Testing Filter Options Integration');
  console.log('=' .repeat(50));
  
  const filterOptions = await testEndpoint(
    'Filter Options',
    ENDPOINTS.filterOptions,
    ['specialties', 'examTypes', 'years', 'difficulties']
  );
  
  if (filterOptions) {
    console.log(`Filter Options Summary:`);
    console.log(`- Specialties: ${filterOptions.specialties?.length || 0}`);
    console.log(`- Exam Types: ${filterOptions.examTypes?.length || 0}`);
    console.log(`- Years: ${filterOptions.years?.length || 0}`);
    console.log(`- Difficulties: ${filterOptions.difficulties?.length || 0}`);
    
    // Check if years match between endpoints
    if (filterOptions.years && filterOptions.years.length <= 3) {
      console.error('🚨 Filter options also showing limited years!');
    }
  }
}

async function testLoadTesting() {
  console.log('\n⚡ Load Testing');
  console.log('=' .repeat(50));
  
  const concurrentRequests = 10;
  const requests = [];
  
  console.log(`Making ${concurrentRequests} concurrent requests...`);
  
  for (let i = 0; i < concurrentRequests; i++) {
    requests.push(makeRequest(ENDPOINTS.yearsOptimized));
  }
  
  const startTime = Date.now();
  const results = await Promise.all(requests);
  const totalTime = Date.now() - startTime;
  
  const successful = results.filter(r => r.success).length;
  const avgResponseTime = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.responseTime, 0) / successful;
  
  console.log(`Load Test Results:`);
  console.log(`- Successful requests: ${successful}/${concurrentRequests}`);
  console.log(`- Total time: ${totalTime}ms`);
  console.log(`- Average response time: ${avgResponseTime.toFixed(1)}ms`);
  console.log(`- Requests per second: ${(concurrentRequests / (totalTime / 1000)).toFixed(1)}`);
  
  // Check for cache hits
  const cachedResponses = results.filter(r => r.success && r.data.cached).length;
  console.log(`- Cache hit ratio: ${(cachedResponses / successful * 100).toFixed(1)}%`);
}

async function generateReport() {
  console.log('\n📋 Test Report');
  console.log('=' .repeat(50));
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: Object.keys(performanceResults.endpoints).length,
      errors: performanceResults.errors.length,
      avgResponseTime: Object.values(performanceResults.endpoints)
        .reduce((sum, result) => sum + result.responseTime, 0) / 
        Object.keys(performanceResults.endpoints).length
    },
    endpoints: performanceResults.endpoints,
    errors: performanceResults.errors,
    recommendations: []
  };
  
  // Generate recommendations
  if (report.errors.length > 0) {
    report.recommendations.push('Fix failing endpoints before deployment');
  }
  
  if (report.summary.avgResponseTime > 1000) {
    report.recommendations.push('Consider additional performance optimizations');
  }
  
  // Check for the main issue
  const yearsCount = performanceResults.endpoints['Optimized Years API']?.method;
  if (yearsCount && yearsCount.includes('fallback')) {
    report.recommendations.push('Database connection or RPC functions may not be working properly');
  }
  
  // Save report
  const reportPath = path.join(__dirname, '..', 'test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('✅ Test completed successfully');
  console.log(`📄 Report saved to: ${reportPath}`);
  
  if (report.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    report.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }
}

async function main() {
  console.log('🚀 Starting Years Filter Optimization Tests');
  console.log('Testing against:', BASE_URL);
  console.log('=' .repeat(60));
  
  try {
    // Run all tests
    await testYearsEndpoints();
    await testCachePerformance();
    await testCacheManagement();
    await testFilterOptionsIntegration();
    await testLoadTesting();
    
    // Generate final report
    await generateReport();
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testYearsEndpoints,
  testCachePerformance,
  performanceResults
};