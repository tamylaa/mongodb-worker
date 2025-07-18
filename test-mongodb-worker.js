import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';

// Configure dotenv
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Configuration
const MONGODB_WORKER_URL = process.env.MONGODB_WORKER_URL || 'http://localhost:3002';
const API_KEY = process.env.MONGODB_WORKER_API_KEY || 'dev-secret-key-12345';

// Test user data
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  name: 'Test User',
  password: 'testpassword123'
};

// API request helper
async function apiRequest(endpoint, options = {}) {
  const url = new URL(endpoint, MONGODB_WORKER_URL).toString();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || 'API request failed');
    error.response = response;
    error.data = data;
    throw error;
  }

  return { data };
}

// Test runner
export async function runTests() {
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
export async function testHealthCheck() {
  const response = await apiRequest('/health', { method: 'GET' });
  console.log('  ✅ Health Check:', response.data);
  return response.data;
}

// 2. Test User Operations
export async function testUserOperations() {
  const createResponse = await apiRequest('/api/users', {
    method: 'POST',
    body: {
      email: TEST_USER.email,
      name: TEST_USER.name
    }
  });
  console.log('  ✅ User created:', createResponse.data);
  const userId = createResponse.data._id;
  
  const getResponse = await apiRequest(`/api/users/${userId}`, {
    method: 'GET'
  });
  console.log('  ✅ User retrieved:', getResponse.data);
  return userId;
}

export async function testMagicLinkOperations(userId) {
  const response = await apiRequest(`/api/users/${userId}/magic-links`, {
    method: 'POST',
    body: {
      userId,
      email: TEST_USER.email,
      name: TEST_USER.name
    }
  });
  
  console.log('  ✅ Magic link created:', {
    token: response.data.token.substring(0, 10) + '...',
    expiresAt: response.data.expiresAt
  });
  
  return {
    token: response.data.token,
    expiresAt: response.data.expiresAt
  };
}

export async function testMagicLinkVerification(token) {
  const response = await apiRequest(`/api/magic-links/verify?token=${token}`, {
    method: 'GET'
  });
  
  console.log('  ✅ Magic link verified:', {
    userId: response.data.userId,
    email: response.data.email
  });
  
  return response.data;
}

// Run the tests
runTests();
