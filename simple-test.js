import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Set up file logging
const logFile = path.join(process.cwd(), 'test-debug.log');
const logStream = fs.createWriteStream(logFile, { flags: 'w' });

function log(message, data) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
  logStream.write(entry);
  console.log(entry.trim());
}

// Override console.log to also write to file
const originalConsoleLog = console.log;
console.log = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  log(message);
  originalConsoleLog(...args);
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log('UNCAUGHT EXCEPTION', { 
    error: error.message, 
    stack: error.stack 
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log('UNHANDLED REJECTION', { 
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined
  });
  process.exit(1);
});

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3002',
  endpoints: {
    health: '/health',
    requestMagicLink: '/api/auth/magic-link',
    verifyMagicLink: '/api/auth/verify',
    getCurrentUser: '/api/auth/me'
  },
  testUser: {
    email: `test-${Date.now()}@example.com`,
    name: 'Test User'
  }
};

// Simple test runner
async function runTest(name, testFn) {
  console.log(`\n=== TEST: ${name} ===`);
  try {
    await testFn();
    console.log(`✅ ${name} - PASSED`);
    return true;
  } catch (error) {
    console.error(`❌ ${name} - FAILED`);
    console.error(error.message);
    if (error.response) {
      console.error('Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        body: error.response._bodyText || error.response.body
      });
    }
    return false;
  }
}

// Test health check
async function testHealthCheck() {
  const url = `${TEST_CONFIG.baseUrl}${TEST_CONFIG.endpoints.health}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = new Error(`Health check failed: ${response.statusText}`);
    error.response = response;
    throw error;
  }
  
  const data = await response.json();
  if (data.status !== 'ok') {
    throw new Error(`Unexpected health check response: ${JSON.stringify(data)}`);
  }
}

// Helper function to log raw response details
async function logResponseDetails(response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  const responseText = await response.text();
  
  console.log('\n=== RAW RESPONSE ===');
  console.log(`Status: ${response.status} ${response.statusText}`);
  console.log('Headers:', JSON.stringify(headers, null, 2));
  console.log('Body:', responseText);
  
  try {
    return JSON.parse(responseText);
  } catch (e) {
    console.error('Failed to parse response as JSON');
    return responseText;
  }
}

// Test magic link request
async function testMagicLinkRequest() {
  const url = `${TEST_CONFIG.baseUrl}${TEST_CONFIG.endpoints.requestMagicLink}`;
  const requestBody = {
    email: TEST_CONFIG.testUser.email,
    name: TEST_CONFIG.testUser.name
  };
  
  console.log('\n=== MAKING MAGIC LINK REQUEST ===');
  console.log('URL:', url);
  console.log('Request Body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  const responseData = await logResponseDetails(response.clone());
  
  if (!response.ok) {
    const error = new Error(`Magic link request failed: ${response.statusText}`);
    error.response = response;
    throw error;
  }

  // Check response format
  if (typeof responseData === 'string') {
    throw new Error(`Unexpected response format (string): ${responseData}`);
  }
  
  if (!responseData.success) {
    throw new Error(`Request failed: ${responseData.message || 'Unknown error'}`);
  }

  if (!responseData.data || !responseData.data.token) {
    throw new Error(`Invalid response format. Expected token in data.token. Got: ${JSON.stringify(responseData, null, 2)}`);
  }

  return responseData.data.token;
}

// Main test function
async function runAllTests() {
  log('🚀 Starting tests...');
  log('Node.js version:', process.version);
  log('Test config:', TEST_CONFIG);
  log('Current directory:', process.cwd());
  
  let allPassed = true;

  // Run health check
  allPassed = await runTest('Health Check', testHealthCheck) && allPassed;

  // Run magic link test
  const token = await runTest('Magic Link Request', testMagicLinkRequest);
  allPassed = token ? allPassed : false;

  // Print summary
  const summary = allPassed ? '🎉 All tests passed!' : '❌ Some tests failed';
  log('\n=== TEST SUMMARY ===', { summary });
  
  if (allPassed) {
    const testInstructions = {
      message: 'To test the magic link flow:',
      steps: [
        `Use this token to verify: ${token}`,
        `Send a POST request to ${TEST_CONFIG.baseUrl}${TEST_CONFIG.endpoints.verifyMagicLink}`,
        `With body: { "token": "${token}" }`
      ]
    };
    log('Test instructions', testInstructions);
  }
  
  // Close the log stream
  logStream.end();

  process.exit(allPassed ? 0 : 1);
}

// Run tests
console.log('Starting test execution...');
runAllTests().catch(error => {
  console.error('\n=== UNHANDLED ERROR ===');
  console.error('Error:', error.message);
  if (error.stack) {
    console.error('Stack:', error.stack.split('\n').slice(1).join('\n'));
  }
  process.exit(1);
});
