import { jsonResponse } from '../utils/response.js';
import { generateToken, verifyToken } from '../utils/token.js';

/**
 * Handle authentication requests
 * @param {Request} request - The incoming request
 * @param {D1Client} d1Client - The D1 database client
 * @param {Object} env - The Cloudflare Workers environment
 * @returns {Promise<Response>} The authentication response
 */
export async function handleAuth(request, d1Client, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/auth', '');

  try {
    // Handle different auth endpoints
    if (path === '/magic-link' && request.method === 'POST') {
      return await handleMagicLink(request, d1Client, env);
    } else if (path === '/verify' && request.method === 'POST') {
      return await handleVerifyMagicLink(request, d1Client, env);
    } else if (path === '/me' && request.method === 'GET') {
      return await handleGetCurrentUser(request, d1Client, env);
    }

    return jsonResponse({ error: 'Not Found' }, 404);
  } catch (error) {
    console.error('Auth error:', error);
    return jsonResponse(
      { error: 'Authentication failed', message: error.message },
      error.statusCode || 500
    );
  }
}

/**
 * Handle magic link generation
 */
async function handleMagicLink(request, d1Client, env) {
  const { email, name } = await request.json();
  
  if (!email) {
    throw { statusCode: 400, message: 'Email is required' };
  }

  // Create or get user and generate magic link
  const { token, expiresAt, user } = await d1Client.createMagicLink({ 
    email, 
    name 
  });

  // In a real app, you would send the magic link via email
  const magicLink = `${new URL(request.url).origin}/auth/verify?token=${token}`;
  
  // For development, return the magic link in the response
  return jsonResponse({
    success: true,
    message: 'Magic link generated',
    // In production, you wouldn't return the magic link
    // but for development, it's helpful to see it
    magicLink: process.env.NODE_ENV === 'development' ? magicLink : undefined,
    expiresAt
  });
}

/**
 * Handle magic link verification
 */
async function handleVerifyMagicLink(request, d1Client, env) {
  const { token } = await request.json();
  
  if (!token) {
    throw { statusCode: 400, message: 'Token is required' };
  }

  // Verify the magic link and get the user
  const user = await d1Client.verifyMagicLink(token);
  
  // Generate JWT token
  const authToken = await generateToken(
    { userId: user.id, email: user.email },
    env.JWT_SECRET,
    '7d' // 7 days expiration
  );

  return jsonResponse({
    success: true,
    token: authToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isEmailVerified: user.isEmailVerified
    }
  });
}

/**
 * Get current authenticated user
 */
async function handleGetCurrentUser(request, d1Client, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { statusCode: 401, message: 'Unauthorized' };
  }

  const token = authHeader.split(' ')[1];
  const decoded = await verifyToken(token, env.JWT_SECRET);
  
  const user = await d1Client.findUserById(decoded.userId);
  if (!user) {
    throw { statusCode: 404, message: 'User not found' };
  }

  return jsonResponse({
    id: user.id,
    email: user.email,
    name: user.name,
    isEmailVerified: user.isEmailVerified,
    lastLogin: user.lastLogin
  });
}
