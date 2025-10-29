// Test script for Hotels Server
// Note: You may need to install node-fetch: npm install node-fetch
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:2314';

async function testEndpoint(method, endpoint, body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`✅ ${method} ${endpoint} - Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
    console.log('');
    
    return { success: true, data };
  } catch (error) {
    console.log(`❌ ${method} ${endpoint} - Error: ${error.message}`);
    console.log('');
    return { success: false, error };
  }
}

async function runTests() {
  console.log('🧪 Testing Hotels Server...\n');
  
  // Test health check
  await testEndpoint('GET', '/health');
  
  // Test DynamoDB endpoints
  await testEndpoint('GET', '/hotels');
  await testEndpoint('GET', '/hotels/search?name=Marriott');
  await testEndpoint('GET', '/hotels/location?region=Dubai');
  
  // Test Ratehawk endpoints
  await testEndpoint('POST', '/ratehawk/suggest', {
    query: 'Dubai',
    language: 'en',
    limit: 5
  });
  
  await testEndpoint('POST', '/ratehawk/search', {
    checkin: '2025-12-01',
    checkout: '2025-12-05',
    region_id: '965847972'
  });
  
  // Test TBO endpoints
  await testEndpoint('POST', '/tbo/suggest', {
    query: 'Abu Dhabi',
    country_code: 'AE'
  });
  
  await testEndpoint('POST', '/tbo/hotel-codes', {
    CityCode: '100765',
    IsDetailedResponse: 'true'
  });
  
  await testEndpoint('POST', '/tbo/search', {
    tbo_city_code: '100765',
    CheckIn: '2025-12-01',
    CheckOut: '2025-12-05',
    country_code: 'AE'
  });
  
  // Test combined search
  await testEndpoint('POST', '/search/hotels', {
    checkin: '2025-12-01',
    checkout: '2025-12-05',
    region_id: '965847972',
    tbo_city_code: '100765',
    country_code: 'AE'
  });
  
  console.log('🎉 Tests completed!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testEndpoint, runTests };
