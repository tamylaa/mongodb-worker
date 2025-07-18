import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { D1Client, resetDevDb } from './src/shared/clients/d1Client.js';

// Set environment to development for in-memory database
process.env.NODE_ENV = 'development';

const execAsync = promisify(exec);

// Configuration
const TEST_EMAIL = 'test-user@example.com';
const TEST_PASSWORD = 'test-password-123';
const BASE_URL = 'http://localhost:3002'; // Local development port
// Global variables to store test data
let authToken = '';
let userId = '';
let magicLinkToken = '';

// Initialize test database with a clean state
async function initTestDb() {
  try {
    console.log('   Creating new D1Client instance...');
    
    // Reset the in-memory database to ensure a clean state
    resetDevDb();
    
    const client = new D1Client();
    
    console.log('   Initializing database...');
    await client.initialize();
    
    // Verify we can query the database
    console.log('   Verifying database connection...');
    try {
      const users = await client.db.prepare('SELECT * FROM users').all();
      const magicLinks = await client.db.prepare('SELECT * FROM magic_links').all();
      
      if (users.results && users.results.length > 0) {
        console.log(`   Found ${users.results.length} users in the database (should be 0)`);
        // Force reset if we find any users
        resetDevDb();
      } else {
        console.log('   No users found in the database (good)');
      }
      
      if (magicLinks.results && magicLinks.results.length > 0) {
        console.log(`   Found ${magicLinks.results.length} magic links in the database (should be 0)`);
        // Force reset if we find any magic links
        resetDevDb();
      } else {
        console.log('   No magic links found in the database (good)');
      }
      
      return client;
    } catch (queryError) {
      console.error('   Error querying database:', queryError.message);
      throw new Error(`Database query failed: ${queryError.message}`);
    }
  } catch (error) {
    console.error('❌ Error initializing test database:');
    console.error(error);
    if (error.message.includes('D1 database binding')) {
      console.error('\n⚠️  Make sure you are running in development mode with NODE_ENV=development');
      console.error('   Try running: $env:NODE_ENV="development"; node test-d1-worker.js\n');
    }
    process.exit(1);
  }
}

// Clean up test data
async function cleanupTestData() {
  try {
    console.log('   Starting test data cleanup...');
    const d1Client = await initTestDb();
    
    // First, try to find the test user by email
    const testUser = await d1Client.findUserByEmail(TEST_EMAIL);
    
    if (testUser) {
      console.log(`   Found test user to clean up: ${testUser.id} (${testUser.email})`);
      
      // Delete any magic links for this user
      console.log('   Deleting magic links for user...');
      const deleteLinksResult = await d1Client.db.prepare('DELETE FROM magic_links WHERE userId = ?')
        .bind(testUser.id)
        .run();
      console.log(`   Deleted ${deleteLinksResult.changes || 0} magic links`);
      
      // Delete the user
      console.log('   Deleting user...');
      const deleteUserResult = await d1Client.db.prepare('DELETE FROM users WHERE id = ?')
        .bind(testUser.id)
        .run();
      console.log(`   Deleted user: ${deleteUserResult.changes > 0 ? 'success' : 'not found'}`);
    } else {
      console.log('   No test user found to clean up');
    }
    
    // Also clean up any stale magic links
    console.log('   Cleaning up stale magic links...');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const staleLinksResult = await d1Client.db.prepare('DELETE FROM magic_links WHERE expiresAt < ?')
      .bind(oneHourAgo)
      .run();
    console.log(`   Deleted ${staleLinksResult.changes || 0} stale magic links`);
    
    console.log('   Test data cleanup complete');
  } catch (error) {
    console.error('Error during test cleanup:', error);
    throw error;
  } finally {
    // Reset test variables
    userId = null;
    authToken = null;
    magicLinkToken = null;
  }
}

// Test runner
async function runTests() {
  try {
    console.log('🚀 Starting D1 Worker Tests...\n');
    console.log(`Test Configuration:`);
    console.log(`- Base URL: ${BASE_URL}`);
    console.log(`- Test Email: ${TEST_EMAIL}`);
    console.log(`- Environment: ${process.env.NODE_ENV || 'development'}\n`);
    
    // Initialize global test variables
    let d1Client;
    
    try {
      // Initialize test database and clean up any existing data
      console.log('1. Initializing test database...');
      d1Client = await initTestDb();
      if (!d1Client || !d1Client.db) {
        throw new Error('Failed to initialize database client');
      }
      console.log('   ✓ Test database initialized');
      
      console.log('\n2. Verifying database connection...');
      try {
        const dbInfo = await d1Client.db.prepare('SELECT name FROM sqlite_master WHERE type="table"').all();
        console.log('   ✓ Database connection successful');
        console.log('   Available tables:', dbInfo.results.map(t => t.name).join(', '));
      } catch (dbError) {
        console.error('   ❌ Database connection failed:', dbError.message);
        throw new Error('Failed to connect to database');
      }
      
      console.log('\n3. Cleaning up test data...');
      await cleanupTestData();
      console.log('   ✓ Test data cleanup complete');
      
      // Verify the database is empty
      console.log('\n4. Verifying database is clean...');
      try {
        console.log('   Checking users table...');
        const usersQuery = await d1Client.db.prepare('SELECT * FROM users');
        if (!usersQuery) throw new Error('Failed to prepare users query');
        
        const users = await usersQuery.all();
        console.log('   Users query result:', JSON.stringify(users, null, 2));
        
        if (users && users.results && users.results.length > 0) {
          console.error('   ❌ Users found after cleanup:');
          console.error(JSON.stringify(users.results, null, 2));
          throw new Error('Users found after cleanup');
        }
        
        console.log('   Checking magic_links table...');
        const magicLinksQuery = await d1Client.db.prepare('SELECT * FROM magic_links');
        if (!magicLinksQuery) throw new Error('Failed to prepare magic_links query');
        
        const magicLinks = await magicLinksQuery.all();
        console.log('   Magic links query result:', JSON.stringify(magicLinks, null, 2));
        
        if (magicLinks && magicLinks.results && magicLinks.results.length > 0) {
          console.error('   ❌ Magic links found after cleanup:');
          console.error(JSON.stringify(magicLinks.results, null, 2));
          throw new Error('Magic links found after cleanup');
        }
        
        console.log('   ✓ Database is clean');
      } catch (verifyError) {
        console.error('   ❌ Failed to verify database state:', verifyError.message);
        throw verifyError;
      }
      
      // Store the test user ID for later use
      try {
        const testUser = await d1Client.findUserByEmail(TEST_EMAIL);
        if (testUser) {
          console.log('\n⚠️  Found existing test user:', JSON.stringify(testUser, null, 2));
          userId = testUser.id;
        } else {
          console.log('\n   No existing test user found');
        }
      } catch (userError) {
        console.error('   ❌ Error checking for existing test user:', userError.message);
        throw userError;
      }

      // Run tests in sequence with better error handling
      const tests = [
        { 
          name: 'Health Check', 
          fn: testHealthCheck,
          description: 'Verifies the API is running and accessible'
        },
        { 
          name: 'User Registration', 
          fn: testUserRegistration,
          description: 'Registers a new test user'
        },
        { 
          name: 'Magic Link Generation', 
          fn: testMagicLinkGeneration,
          description: 'Generates a magic link for the test user'
        },
        { 
          name: 'Magic Link Verification', 
          fn: testMagicLinkVerification,
          description: 'Verifies the magic link and gets an auth token'
        },
        { 
          name: 'Get Current User', 
          fn: testGetCurrentUser,
          description: 'Gets the current user profile using the auth token'
        },
        { 
          name: 'Update User', 
          fn: testUpdateUser,
          description: 'Updates the test user profile'
        },
        { 
          name: 'Get All Users', 
          fn: testGetAllUsers,
          description: 'Gets a list of all users (admin function)'
        },
        { 
          name: 'Get User by ID', 
          fn: testGetUserById,
          description: 'Gets a user by ID'
        }
      ];
      
      console.log('\n--- Starting Tests ---');
      for (const [index, test] of tests.entries()) {
        try {
          console.log(`\n${index + 1}. ${test.name} - ${test.description}`);
          console.log('   Starting test...');
          
          // Log test state before execution
          console.log('   Test state before execution:', {
            hasAuthToken: !!authToken,
            hasUserId: !!userId,
            hasMagicLinkToken: !!magicLinkToken
          });
          
          // Execute the test
          await test.fn();
          
          // Log test state after successful execution
          console.log('   Test state after execution:', {
            hasAuthToken: !!authToken,
            hasUserId: !!userId,
            hasMagicLinkToken: !!magicLinkToken
          });
          
          console.log(`   ✓ ${test.name} passed`);
        } catch (testError) {
          console.error(`\n❌ ${test.name} failed with error: ${testError.message}`);
          console.error('Error details:', {
            name: testError.name,
            stack: testError.stack,
            response: testError.response ? {
              status: testError.response.status,
              statusText: testError.response.statusText,
              data: testError.response.data
            } : 'No response object',
            testState: {
              hasAuthToken: !!authToken,
              hasUserId: !!userId,
              hasMagicLinkToken: !!magicLinkToken
            }
          });
          
          // If this is a response error, log more details
          if (testError.response) {
            try {
              const errorBody = await testError.response.text();
              console.error('Response body:', errorBody);
            } catch (e) {
              console.error('Could not read response body:', e.message);
            }
          }
          
          throw testError; // Stop on first failure
        }
      }
      
      console.log('\n✅ All tests passed successfully!\n');
      process.exit(0);
      
    } catch (setupError) {
      console.error('\n❌ Test setup failed:', setupError.message);
      console.error(setupError.stack);
      throw setupError;
    }
    
  } catch (error) {
    console.error('\n❌ Test run failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      if (error.response.data) {
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
    }
    process.exit(1);
  }
}

// Test: Health Check
async function testHealthCheck() {
  console.log('1. Testing health check...');
  const response = await fetch(`${BASE_URL}/health`);
  const data = await response.json();
  
  if (data.status !== 'ok') {
    throw new Error(`Health check failed: ${JSON.stringify(data)}`);
  }
  console.log('   ✓ Health check passed');
}

// Test: User Registration
async function testUserRegistration() {
  console.log('2. Testing user registration...');
  console.log(`   Registering user with email: ${TEST_EMAIL}`);
  
  const userData = {
    email: TEST_EMAIL,
    name: 'Test User',
    password: TEST_PASSWORD
  };
  
  console.log('   Sending registration request with data:', JSON.stringify(userData, null, 2));
  
  const response = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  const data = await response.json();
  console.log('   Registration response:', JSON.stringify(data, null, 2));
  
  if (!response.ok) {
    throw new Error(`User registration failed: ${data.message || response.statusText}`);
  }
  
  if (!data.id) {
    throw new Error('No user ID in registration response');
  }
  
  userId = data.id;
  console.log(`   ✓ User registered with ID: ${userId}`);
  
  // Verify the user was actually created
  const verifyResponse = await fetch(`${BASE_URL}/api/users/${userId}`);
  const user = await verifyResponse.json();
  console.log('   Retrieved user after registration:', JSON.stringify(user, null, 2));
  
  if (user.email !== TEST_EMAIL) {
    throw new Error(`User email mismatch after registration. Expected: ${TEST_EMAIL}, Got: ${user.email}`);
  }
}

// Test: Magic Link Generation
async function testMagicLinkGeneration() {
  console.log('3. Testing magic link generation...');
  console.log(`   Requesting magic link for email: ${TEST_EMAIL}`);
  
  const response = await fetch(`${BASE_URL}/api/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL })
  });
  
  const data = await response.json();
  console.log('   Magic link response:', JSON.stringify(data, null, 2));
  
  if (!response.ok) {
    throw new Error(`Magic link generation failed: ${data.message || response.statusText}`);
  }
  
  // In the current implementation, the magic link is returned directly in the response
  // as a token, not as a URL with a token parameter
  if (data.token) {
    magicLinkToken = data.token;
    console.log(`   ✓ Magic link generated with token: ${magicLinkToken}`);
  } else if (data.magicLink) {
    // Handle the case where a full URL is returned (for backward compatibility)
    const url = new URL(data.magicLink);
    magicLinkToken = url.searchParams.get('token');
    if (!magicLinkToken) {
      throw new Error('Could not extract token from magic link URL');
    }
    console.log(`   ✓ Magic link generated with URL token: ${magicLinkToken}`);
  } else {
    throw new Error('No token or magic link in response');
  }
}

// Test: Verify Magic Link
async function testMagicLinkVerification() {
  console.log('4. Testing magic link verification...');
  
  if (!magicLinkToken) {
    throw new Error('No magic link token available for verification');
  }
  
  console.log(`   Verifying magic link with token: ${magicLinkToken}`);
  
  try {
    const verifyResponse = await fetch(`${BASE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: magicLinkToken
      })
    });
    
    if (!verifyResponse.ok) {
      let errorMessage = `HTTP error! status: ${verifyResponse.status}`;
      try {
        const errorData = await verifyResponse.json();
        errorMessage = `Magic link verification failed: ${errorData.message || errorMessage}`;
      } catch (e) {
        // If we can't parse the error as JSON, use the status text
        errorMessage = `Magic link verification failed: ${verifyResponse.statusText || errorMessage}`;
      }
      throw new Error(errorMessage);
    }
    
    const data = await verifyResponse.json();
    
    if (!data.token) {
      console.error('Verification response:', JSON.stringify(data, null, 2));
      throw new Error('No auth token received in verification response');
    }
    
    authToken = data.token;
    console.log('   ✓ Magic link verified successfully');
    console.log('   Auth token received');
    
    // Log the user ID from the token for debugging
    if (data.user) {
      userId = data.user.id;
      console.log(`   User ID from token: ${userId}`);
    }
    
  } catch (error) {
    console.error('   ❌ Error during magic link verification:', error.message);
    throw error;
  }
}

// Test: Get Current User
async function testGetCurrentUser() {
  if (!authToken) {
    throw new Error('No auth token available for current user test');
  }
  
  console.log('5. Testing get current user...');
  console.log(`   Using auth token: ${authToken.substring(0, 15)}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    console.log('   Current user response:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      throw new Error(`Failed to get current user: ${data.message || response.statusText}`);
    }
    
    if (!data || !data.id) {
      throw new Error('Invalid user data in response');
    }
    
    // Verify the email matches the test user
    if (data.email !== TEST_EMAIL) {
      console.error(`   ERROR: Email mismatch! Expected: ${TEST_EMAIL}, Got: ${data.email}`);
      console.error('   Full user data:', JSON.stringify(data, null, 2));
      
      // Try to fetch the user directly from the database for debugging
      try {
        const d1Client = await initTestDb();
        const dbUser = await d1Client.findUserById(data.id);
        console.error('   User from database:', JSON.stringify(dbUser, null, 2));
      } catch (dbError) {
        console.error('   Error fetching user from database:', dbError.message);
      }
      
      throw new Error(`Unexpected user data received. Expected email: ${TEST_EMAIL}, Got: ${data.email}`);
    }
    
    console.log(`   ✓ Current user verified as ${data.email}`);
  } catch (error) {
    console.error('   Error in testGetCurrentUser:', error);
    throw error;
  }
}

// Test: Update User
async function testUpdateUser() {
  console.log('6. Testing user update...');
  const newName = 'Updated Test User';
  
  try {
    console.log(`   Updating user ${userId} with new name: ${newName}`);
    
    const response = await fetch(`${BASE_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ name: newName })
    });
    
    const data = await response.json();
    
    console.log('   Update response status:', response.status);
    console.log('   Update response data:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      throw new Error(`User update failed: ${data.message || response.statusText}`);
    }
    
    if (data.name !== newName) {
      console.error('   ❌ Name not updated correctly in response');
      console.error(`   Expected: ${newName}, Got: ${data.name || 'undefined'}`);
      
      // Verify the current user data
      const currentUserResponse = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (currentUserResponse.ok) {
        const currentUser = await currentUserResponse.json();
        console.log('   Current user data from /api/auth/me:', JSON.stringify(currentUser, null, 2));
      } else {
        console.error('   Failed to fetch current user data');
      }
      
      // Check database directly
      try {
        const d1Client = await initTestDb();
        const dbUser = await d1Client.findUserById(userId);
        console.log('   User from database:', JSON.stringify(dbUser, null, 2));
      } catch (dbError) {
        console.error('   Error fetching user from database:', dbError.message);
      }
      
      throw new Error('User name was not updated correctly');
    }
    
    console.log(`   ✓ User updated: ${data.name}`);
  } catch (error) {
    console.error('   Error in testUpdateUser:', error);
    throw error;
  }
}

// Test: Get All Users
async function testGetAllUsers() {
  console.log('7. Testing get all users...');
  const response = await fetch(`${BASE_URL}/api/users`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to get users: ${data.message || response.statusText}`);
  }
  
  if (!Array.isArray(data)) {
    throw new Error('Expected an array of users');
  }
  
  console.log(`   ✓ Retrieved ${data.length} users`);
}

// Test: Get User by ID
async function testGetUserById() {
  console.log('8. Testing get user by ID...');
  const response = await fetch(`${BASE_URL}/api/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to get user by ID: ${data.message || response.statusText}`);
  }
  
  if (data.id !== userId) {
    throw new Error('Unexpected user data received');
  }
  
  console.log(`   ✓ Retrieved user by ID: ${data.email}`);
}

// Run the tests
runTests().catch(console.error);
