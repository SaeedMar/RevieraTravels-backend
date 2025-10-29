const axios = require('axios');

// Test script for Duffle API integration
async function testDuffleAPI() {
  console.log('🧪 Testing Duffle API Integration...\n');

  const baseURL = 'http://localhost:2314';
  
  try {
    // Test 1: Health check
    console.log('1. Testing server health...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ Server is running:', healthResponse.data);
    console.log('');

    // Test 2: Airport search
    console.log('2. Testing airport search...');
    try {
      const airportResponse = await axios.get(`${baseURL}/flights/airports?q=London`);
      console.log('✅ Airport search successful:', airportResponse.data);
    } catch (error) {
      console.log('❌ Airport search failed:', error.response?.data || error.message);
    }
    console.log('');

    // Test 3: Flight search
    console.log('3. Testing flight search...');
    try {
      const flightSearchData = {
        origin: 'LHR',
        destination: 'CDG',
        departureDate: '2025-06-15',
        passengers: [{ type: 'adult' }],
        cabinClass: 'economy',
        maxConnections: 2
      };
      
      const flightResponse = await axios.post(`${baseURL}/flights/search`, flightSearchData);
      console.log('✅ Flight search successful:', flightResponse.data);
    } catch (error) {
      console.log('❌ Flight search failed:', error.response?.data || error.message);
    }
    console.log('');

    console.log('🎉 Duffle API testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDuffleAPI();

