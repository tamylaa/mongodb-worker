import { 
  findUserById,
  findUserByEmail,
  createUser,
  updateUser
} from '../../../src/shared/services/userService.js';

/**
 * Handle GET /api/users/:id
 */
async function handleGetUserById(request) {
  try {
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();
    const user = await findUserById(userId, request);
    
    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User not found'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        data: user
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
    
  } catch (error) {
    console.error('Get user by ID error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
}

/**
 * Handle GET /api/users/email/:email
 */
async function handleGetUserByEmail(request) {
  try {
    const url = new URL(request.url);
    const email = decodeURIComponent(url.pathname.split('/').pop());
    const user = await findUserByEmail(email, request);
    
    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User not found'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        data: user
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
    
  } catch (error) {
    console.error('Get user by email error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
}

/**
 * Handle POST /api/users
 */
async function handleCreateUser(request) {
  try {
    const data = await request.json();
    const user = await createUser(data, request);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: user
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
    console.error('Create user error:', error);
    
    if (error.message === 'User already exists') {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message
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
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
}

/**
 * Handle PATCH /api/users/:id
 */
async function handleUpdateUser(request) {
  try {
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();
    const updates = await request.json();
    
    const updatedUser = await updateUser(userId, updates, request);
    
    if (!updatedUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User not found'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        data: user
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
    
  } catch (error) {
    console.error('Update user error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
}

/**
 * Main handler for user routes
 * @param {Request} request - The incoming request
 * @returns {Promise<Response>} The response
 */
export function handleUserRoutes(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Handle OPTIONS request for CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  
  // Route to the appropriate handler based on the HTTP method and path
  if (request.method === 'GET' && path.match(/^\/api\/users\/[^\/]+$/)) {
    return handleGetUserById(request);
  } else if (request.method === 'GET' && path.match(/^\/api\/users\/email\/[^\/]+$/)) {
    return handleGetUserByEmail(request);
  } else if (request.method === 'POST' && path === '/api/users') {
    return handleCreateUser(request);
  } else if (request.method === 'PATCH' && path.match(/^\/api\/users\/[^\/]+$/)) {
    return handleUpdateUser(request);
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
