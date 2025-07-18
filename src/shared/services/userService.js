import { getMongoDBClient } from '../clients/mongodbHttpClient.js';

/**
 * Find a user by ID
 * @param {string} userId - The user ID to find
 * @returns {Promise<Object>} The user object or null if not found
 */
export async function findUserById(userId, request = {}) {
  const client = getMongoDBClient(request);
  const response = await client.findUserById(userId);
  return response.data;
}

/**
 * Find a user by email
 * @param {string} email - The email to search for
 * @returns {Promise<Object>} The user object or null if not found
 */
export async function findUserByEmail(email, request = {}) {
  const client = getMongoDBClient(request);
  const response = await client.findUserByEmail(email);
  return response.data;
}

/**
 * Create a new user
 * @param {Object} userData - The user data
 * @param {string} userData.email - User's email
 * @param {string} [userData.name] - User's name (optional)
 * @returns {Promise<Object>} The created user
 */
export async function createUser({ email, name = '' }, request = {}) {
  const client = getMongoDBClient(request);
  const response = await client.createUser({ email, name });
  return response.data;
}

/**
 * Update a user
 * @param {string} userId - The ID of the user to update
 * @param {Object} updates - The updates to apply
 * @returns {Promise<Object>} The updated user
 */
export async function updateUser(userId, updates, request = {}) {
  const client = getMongoDBClient(request);
  const response = await client.updateUser(userId, updates);
  return response.data;
}

/**
 * Create a magic link for a user
 * @param {string} userId - The ID of the user
 * @param {Object} [options] - Options for the magic link
 * @param {string} [options.email] - Email for new user creation if user doesn't exist
 * @param {string} [options.name] - Name for new user creation
 * @param {Object} [request] - The request object for environment variables
 * @returns {Promise<Object>} The magic link data
 */
export async function createMagicLink(userId, { email, name } = {}, request = {}) {
  const client = getMongoDBClient(request);
  const response = await client.createMagicLink({
    userId,
    email,
    name
  });
  
  return response.data;
}

/**
 * Verify a magic link token
 * @param {string} token - The magic link token to verify
 * @param {Object} [request] - The request object for environment variables
 * @returns {Promise<Object>} The user data if verification is successful
 */
export async function verifyMagicLink(token, request = {}) {
  const client = getMongoDBClient(request);
  const response = await client.verifyMagicLink(token);
  return response.data;
}
