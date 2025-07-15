const axios = require('axios');
require('dotenv').config();

// Configuration
const MONGODB_WORKER_URL = process.env.MONGODB_WORKER_URL || 'http://localhost:3002';
const API_KEY = process.env.MONGODB_WORKER_API_KEY || 'dev-secret-key-12345';

// Test user data
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  name: 'Test User',
  password: 'testpassword123'
};

// Axios instance with default config
const api = axios.create({
  baseURL: MONGODB_WORKER_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  }
});

// Test runner
async function runTests() {
  try {
    console.log('🚀 Starting MongoDB Worker Tests...');
    console.log(`🔗 Testing against: ${MONGODB_WORKER_URL}`);
    
    // 1. Test Health Check
    console.log('\n1. Testing Health Check...');
    await testHealthCheck();
    
    // 2. Test User Operations
    console.log('\n2. Testing User Operations...');
    const userId = await testUserOperations();
    
    // 3. Test Magic Link Operations
    console.log('\n3. Testing Magic Link Operations...');
    const { token, expiresAt } = await testMagicLinkOperations(userId);
    
    // 4. Test Magic Link Verification
    console.log('\n4. Testing Magic Link Verification...');
    await testMagicLinkVerification(token);
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    process.exit(1);
  }
}

// 1. Test Health Check
async function testHealthCheck() {
  const response = await api.get('/health');
  console.log('  ✅ Health Check:', response.data);
  return response.data;
}

// 2. Test User Operations
async function testUserOperations() {
  const createResponse = await api.post('/api/users', {
    email: TEST_USER.email,
    name: TEST_USER.name
  });
  console.log('  ✅ User created:', createResponse.data);
  const userId = createResponse.data.data._id;
  const getResponse = await api.get(`/api/users/${userId}`);
  console.log('  ✅ User retrieved:', getResponse.data);
  return userId;
}

async function testMagicLinkOperations(userId) {
  const response = await api.post(`/api/users/${userId}/magic-links`, {
    userId,
    email: TEST_USER.email,
    name: TEST_USER.name
  });
  console.log('  ✅ Magic link created:', {
    token: response.data.data.token.substring(0, 10) + '...',
    expiresAt: response.data.data.expiresAt
  });
  return {
    token: response.data.data.token,
    expiresAt: response.data.data.expiresAt
  };
}

async function testMagicLinkVerification(token) {
  const response = await api.get(`/api/magic-links/verify?token=${token}`);
  console.log('  ✅ Magic link verified:', {
    userId: response.data.data.userId,
    email: response.data.data.email
  });
  return response.data;
}

// Run the tests
runTests();
