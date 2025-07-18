import { 
  createMagicLink as createMagicLinkService,
  verifyMagicLink as verifyMagicLinkService
} from '../../../src/shared/services/userService.js';

/**
 * Handle magic link request
 * @param {Request} request - The incoming request
 * @returns {Promise<Response>} The response
 */
async function handleMagicLinkRequest(request) {
  try {
    const { email, name } = await request.json();
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'A valid email address is required' 
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    // Request magic link using the shared service
    const result = await createMagicLinkService({ email, name }, request);
    
    // Get FRONTEND_URL from environment variables
    const frontendUrl = request.env?.FRONTEND_URL || 'http://localhost:3000';
    const magicLink = `${frontendUrl}/auth/verify?token=${result.token}`;
    
    console.log(`Magic link generated for ${email}: ${magicLink}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Magic link generated successfully',
        // Only return magic link in development
        ...(request.env?.NODE_ENV !== 'production' && { magicLink })
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );

  } catch (error) {
    console.error('Magic link request error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to process magic link request',
        ...(request.env?.NODE_ENV === 'development' && { details: error.stack })
      }),
      { 
        status: error.status || 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
}

/**
 * Verify a magic link
 * @param {URL} url - The request URL
 * @returns {Promise<Response>} The response
 */
async function handleMagicLinkVerification(url) {
  try {
    const token = url.searchParams.get('token');
    
    if (!token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token is required' 
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    // Verify the magic link using the shared service
    const { user, sessionToken } = await verifyMagicLinkService(token, request);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          token: sessionToken,
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        }
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );

  } catch (error) {
    console.error('Magic link verification error:', error);
    const status = error.message === 'Invalid or expired token' ? 400 : 500;
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to verify magic link',
        ...(request.env?.NODE_ENV === 'development' && { details: error.stack })
      }),
      { 
        status,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
}

/**
 * Main handler for auth routes
 * @param {Request} request - The incoming request
 * @returns {Promise<Response>} The response
 */
export async function handleAuthRoutes(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Route to the appropriate handler
  if (request.method === 'POST' && path === '/api/auth/magic-link') {
    return handleMagicLinkRequest(request);
  } else if (request.method === 'GET' && path === '/api/auth/verify') {
    return handleMagicLinkVerification(url);
  } else if (request.method === 'GET' && path === '/api/auth/health') {
    return new Response(
      JSON.stringify({ status: 'ok' }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }

  // 404 for unknown routes
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'Not Found',
      path: path
    }),
    { 
      status: 404, 
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      } 
    }
  );
}
