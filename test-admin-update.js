// Test file for admin update test results API
// Run this with: node test-admin-update.js

const axios = require('axios');

// You'll need to get a valid JWT token for admin user first
const ADMIN_TOKEN = 'your-admin-jwt-token-here';
const STUDENT_ID = 1; // Replace with actual student ID

const testResultsData = {
  cefr_level: 'A2',
  grammar_score: 75,
  speaking_score: 70,
  listening_score: 80,
  reading_score: 78,
  writing_score: 72,
  admin_contact: 'admin_test',
  notes: 'Student shows good progress in listening and reading skills.'
};

async function testUpdateTestResults() {
  try {
    console.log('Testing admin update test results API...');
    console.log('Student ID:', STUDENT_ID);
    console.log('Data to send:', JSON.stringify(testResultsData, null, 2));
    
    const response = await axios.put(`http://localhost:3000/api/v1/students/${STUDENT_ID}/test-results`, testResultsData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    
    console.log('\n✅ Test results updated successfully!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('\n❌ Update failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Network Error:', error.message);
    }
  }
}

// Test login to get admin token first
async function getAdminToken() {
  try {
    console.log('Getting admin token...');
    
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/login', {
      username: 'admin_mall', // Use your admin username
      password: 'admin123'     // Use your admin password
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Admin token obtained');
    return token;
    
  } catch (error) {
    console.error('❌ Failed to get admin token:', error.response?.data || error.message);
    return null;
  }
}

// Run the test
async function runTest() {
  console.log('=== EKLS Admin Update Test Results ===\n');
  
  const token = await getAdminToken();
  if (!token) {
    console.error('Cannot proceed without admin token');
    return;
  }
  
  // Replace the placeholder token with actual token
  const originalToken = ADMIN_TOKEN;
  ADMIN_TOKEN = token;
  
  await testUpdateTestResults();
}

runTest();
