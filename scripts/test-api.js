#!/usr/bin/env node

// Simple test script to verify API functionality
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testAPI(endpoint, options = {}) {
  try {
    console.log(`Testing ${endpoint}...`);
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ ${endpoint} failed:`, data);
      return null;
    }
    
    console.log(`✅ ${endpoint} success:`, data);
    return data;
  } catch (error) {
    console.error(`❌ ${endpoint} error:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('🧪 Testing Quiz API endpoints...\n');

  // Test years endpoint
  await testAPI('/api/questions/years');

  // Test count endpoint with no filters
  await testAPI('/api/questions/count', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: {
        specialties: [],
        examTypes: [],
        years: [],
        difficulties: []
      }
    })
  });

  // Test count endpoint with year filter
  await testAPI('/api/questions/count', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: {
        specialties: [],
        examTypes: [],
        years: [2023, 2024],
        difficulties: []
      }
    })
  });

  // Test filtered questions endpoint (limited to 10 for testing)
  await testAPI('/api/questions/filtered', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: {
        specialties: [],
        examTypes: [],
        years: [],
        difficulties: []
      },
      userId: 'test-user',
      page: 0,
      pageSize: 10
    })
  });

  console.log('\n🏁 Tests completed!');
}

// Only run if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testAPI, runTests };