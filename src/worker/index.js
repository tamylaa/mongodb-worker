import { D1Client } from '../shared/clients/d1Client.js';
import { handleAuth } from './handlers/auth.js';
import { handleUsers } from './handlers/users.js';
import { handleHealth } from './handlers/health.js';

// Initialize D1 client
let d1Client;

// Simple in-memory cache for development
const devCache = new Map();

/**
 * Handle incoming HTTP requests
 * @param {Request} request - The incoming request
 * @param {Object} env - The Cloudflare Workers environment
 * @param {Object} ctx - The Cloudflare Workers context
 * @returns {Promise<Response>} The response to the request
 */
export default {
  async fetch(request, env, ctx) {
    try {
      // Log environment information for debugging
      console.log('Environment Info:', {
        NODE_ENV: env.NODE_ENV || 'not set',
        DB_BINDING_AVAILABLE: !!env.DB,
        DB_BINDING_TYPE: env.DB ? typeof env.DB : 'not available',
        DB_PREPARE_AVAILABLE: env.DB && typeof env.DB.prepare === 'function',
        REQUEST_URL: request.url,
        WORKER_NAME: env.WORKER_NAME || 'not set'
      });

      // Initialize D1 client if not already initialized
      if (!d1Client) {
        try {
          // In development or if DB binding is not available, use in-memory
          if (env.NODE_ENV !== 'production' || !env.DB) {
            console.warn(`Running in ${env.NODE_ENV || 'development'} mode with ${env.DB ? 'D1 binding available' : 'no D1 binding'}`);
            d1Client = new D1Client(env.DB || {});
          } else {
            // In production with DB binding, use the real D1 binding
            console.log('Initializing D1 client with production binding');
            d1Client = new D1Client(env.DB);
          }
          await d1Client.initialize();
        } catch (error) {
          console.error('Failed to initialize D1 client:', error);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Database initialization failed',
              message: error.message 
            }), 
            { 
              status: 500, 
              headers: { 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      const url = new URL(request.url);
      const path = url.pathname;

      // Route requests to appropriate handlers
      if (path.startsWith('/api/auth')) {
        return handleAuth(request, d1Client, env);
      } else if (path.startsWith('/api/users')) {
        return handleUsers(request, d1Client, env);
      } 
      // Handle health check endpoint
      if (path === '/health') {
        return handleHealth(d1Client, env);
      }

      // Return 404 for unknown routes
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Error handling request:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Internal Server Error',
          message: error.message 
        }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  },
};
