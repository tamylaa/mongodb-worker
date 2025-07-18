/**
 * Health check handler
 * @param {D1Client} d1Client - The D1 database client
 * @returns {Promise<Response>} The health check response
 */
export async function handleHealth(d1Client, env) {
  // Debug information about the environment and bindings
  const envInfo = {
    NODE_ENV: env.NODE_ENV || 'not set',
    DB_BINDING_AVAILABLE: !!env.DB,
    DB_BINDING_TYPE: env.DB ? typeof env.DB : 'not available',
    DB_PREPARE_AVAILABLE: env.DB && typeof env.DB.prepare === 'function',
    D1_CLIENT_TYPE: d1Client ? 'initialized' : 'not initialized',
    D1_CLIENT_DB_TYPE: d1Client && d1Client.db ? typeof d1Client.db : 'no db',
    TIMESTAMP: new Date().toISOString()
  };

  // Determine database status
  let dbStatus = 'unknown';
  try {
    if (d1Client && d1Client.db) {
      // Try a simple query to verify the database connection
      const result = await d1Client.db.prepare('SELECT 1 as test').first();
      dbStatus = result && result.test === 1 ? 'ok' : 'query_failed';
    } else {
      dbStatus = 'no_database_connection';
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    dbStatus = `error: ${error.message}`;
  }

  const status = {
    status: 'ok',
    timestamp: envInfo.TIMESTAMP,
    environment: envInfo.NODE_ENV,
    debug: envInfo,
    services: {
      database: dbStatus
    }
  };

  try {
    // Only attempt database health check if not in development mode
    if (process.env.NODE_ENV !== 'development') {
      try {
        await d1Client.db.prepare('SELECT 1').run();
      } catch (dbError) {
        console.error('Database health check failed:', dbError);
        status.status = 'degraded';
        status.services.database = 'unavailable';
        status.databaseError = dbError.message;
      }
    } else {
      status.services.database = 'development (in-memory)';
    }
    
    return new Response(
      JSON.stringify(status, null, 2),
      { 
        status: status.status === 'ok' ? 200 : 503, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        } 
      }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error',
        error: 'Health check failed',
        message: error.message,
        environment: process.env.NODE_ENV || 'development'
      }, null, 2), 
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        } 
      }
    );
  }
}
