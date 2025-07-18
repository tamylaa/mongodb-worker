import { 
  createMagicLink as createMagicLinkService,
  verifyMagicLink as verifyMagicLinkService
} from '../../../src/shared/services/userService.js';

/**
 * Handle POST /api/users/:userId/magic-links
 */
async function handleCreateMagicLink(request) {
  try {
    const url = new URL(request.url);
    const userId = url.pathname.split('/')[3]; // Extract userId from /api/users/{userId}/magic-links
    
    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User ID is required'
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
    
    const { email, name } = await request.json();
    const result = await createMagicLinkService(userId, { email, name }, request);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { 
        status: 201,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
    
  } catch (error) {
    console.error('Create magic link error:', error);
    const status = error.message === 'User not found and no email provided for new user' ? 400 : 500;
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create magic link',
        ...(process.env.NODE_ENV === 'development' && { details: error.stack })
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
 * Handle GET /api/magic-links/verify
 */
async function handleVerifyMagicLink(request) {
  try {
    const url = new URL(request.url);
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
    
    const result = await verifyMagicLinkService(token, request);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
    
  } catch (error) {
    console.error('Verify magic link error:', error);
    const status = error.message === 'Invalid or expired magic link' ? 404 : 500;
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to verify magic link',
        ...(process.env.NODE_ENV === 'development' && { details: error.stack })
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
 * Main handler for magic link routes
 * @param {Request} request - The incoming request
 * @returns {Promise<Response>} The response
 */
export function handleMagicLinkRoutes(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Handle OPTIONS request for CORS preflight
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
  
  // Route to the appropriate handler based on the HTTP method and path
  if (request.method === 'POST' && path.match(/^\/api\/users\/[^\/]+\/magic-links$/)) {
    return handleCreateMagicLink(request);
  } else if (request.method === 'GET' && path === '/api/magic-links/verify' && url.searchParams.has('token')) {
    return handleVerifyMagicLink(request);
  } else if (request.method === 'GET' && path === '/api/magic-links/health') {
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
  
  // Return 404 for unknown routes
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
