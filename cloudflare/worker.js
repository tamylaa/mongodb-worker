// Main Cloudflare Worker entry point
import { handleAuthRoutes } from './api/routes/auth.worker.js';
import { handleUserRoutes } from './api/routes/users.worker.js';
import { handleMagicLinkRoutes } from './api/routes/magicLinks.worker.js';

// Initialize any global state or connections here
let isInitialized = false;

async function initialize() {
  if (isInitialized) return;
  // No need to initialize anything for now
  isInitialized = true;
}

/**
 * Handle incoming requests and route them to the appropriate handler
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @param {Object} ctx - Execution context
 * @returns {Promise<Response>} The response
 */
export default {
  async fetch(request, env, ctx) {
    try {
      // Initialize on first request
      await initialize();
      
      const url = new URL(request.url);
      const path = url.pathname;
      
      // Add environment variables to the request object for handlers to access
      const requestWithEnv = Object.assign(request, { env });
      
      // Route to the appropriate handler based on the path
      if (path.startsWith('/api/auth')) {
        return handleAuthRoutes(requestWithEnv);
      } else if (path.startsWith('/api/users')) {
        return handleUserRoutes(requestWithEnv);
      } else if (path.includes('/magic-links')) {
        return handleMagicLinkRoutes(requestWithEnv);
      } else if (path === '/' || path === '/health') {
        // Simple health check endpoint
        const env = request.env || {};
        return new Response(
          JSON.stringify({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'mongodb-worker',
            environment: env.NODE_ENV || 'development'
          }),
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
          message: 'The requested resource was not found',
          path: path
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
      
    } catch (error) {
      // Global error handler
      console.error('Unhandled error:', error);
      const env = request.env || {};
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
          ...(env.NODE_ENV === 'development' && { details: error.message })
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
};
