const fetch = require('node-fetch');

// Test configuration
const BASE_URL = 'http://localhost:3000'; // Adjust if your app runs on a different port

async function testYearsEndpoint() {
  console.log('\n=== Testing Years Endpoint ===');
  try {
    const response = await fetch(`${BASE_URL}/api/questions/years`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Years endpoint successful');
      console.log(`📊 Found ${data.years?.length || 0} years:`, data.years);
      
      if (data.years && data.years.length > 6) {
        console.log('✅ More than 6 years found - this suggests the fix is working');
      } else {
        console.log('⚠️  Still only finding 6 or fewer years - may need further investigation');
      }
    } else {
      console.log('❌ Years endpoint failed:', data);
    }
  } catch (error) {
    console.log('❌ Years endpoint error:', error.message);
  }
}

async function testCountEndpoint() {
  console.log('\n=== Testing Count Endpoint ===');
  try {
    const filters = {
      specialties: [],
      examTypes: [],
      years: [],
      difficulties: []
    };
    
    const response = await fetch(`${BASE_URL}/api/questions/count`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filters })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Count endpoint successful');
      console.log(`📊 Total questions count: ${data.count}`);
      
      if (data.count > 1000) {
        console.log('✅ More than 1000 questions found - this suggests the batching is working');
      } else {
        console.log('ℹ️  Less than 1000 questions found - this might be expected if the database is small');
      }
    } else {
      console.log('❌ Count endpoint failed:', data);
    }
  } catch (error) {
    console.log('❌ Count endpoint error:', error.message);
  }
}

async function testFilteredEndpoint() {
  console.log('\n=== Testing Filtered Endpoint ===');
  try {
    const filters = {
      specialties: [],
      examTypes: [],
      years: [],
      difficulties: [],
      questionStatus: ['answered', 'unanswered'] // This should trigger the batching logic
    };
    
    const response = await fetch(`${BASE_URL}/api/questions/filtered`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        filters,
        userId: 'test-user-id'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Filtered endpoint successful');
      console.log(`📊 Filtered questions count: ${data.count}`);
      console.log(`📊 Actual questions returned: ${data.questions?.length || 0}`);
    } else {
      console.log('❌ Filtered endpoint failed:', data);
    }
  } catch (error) {
    console.log('❌ Filtered endpoint error:', error.message);
  }
}

async function testDebugEndpoint() {
  console.log('\n=== Testing Debug Endpoint ===');
  try {
    const response = await fetch(`${BASE_URL}/api/questions/debug`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Debug endpoint successful');
      console.log('📊 Debug results:');
      
      data.tests.forEach((test, index) => {
        console.log(`\n${index + 1}. ${test.name}:`);
        if (test.success) {
          console.log('   ✅ Success');
          if (test.name.includes('Year')) {
            console.log('   📊 Result:', JSON.stringify(test.result, null, 2));
          } else {
            console.log('   📊 Result:', test.result);
          }
        } else {
          console.log('   ❌ Failed:', test.error);
        }
      });
    } else {
      console.log('❌ Debug endpoint failed:', data);
    }
  } catch (error) {
    console.log('❌ Debug endpoint error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting endpoint tests...');
  console.log('Make sure your Next.js app is running on', BASE_URL);
  
  await testDebugEndpoint(); // Run debug first to get comprehensive info
  await testYearsEndpoint();
  await testCountEndpoint();
  await testFilteredEndpoint();
  
  console.log('\n✨ Tests completed!');
  console.log('Check the server console logs for detailed debugging information.');
}

// Run the tests
runTests().catch(console.error);