/**
 * D1 Database Configuration
 * 
 * This file contains the configuration for the D1 database.
 * It exports a function to get a D1 database instance.
 */

/**
 * Get a D1 database instance
 * @param {Object} env - The environment object (from Cloudflare Workers)
 * @returns {Object} The D1 database instance
 */
export function getD1Client(env) {
  if (!env.DB) {
    throw new Error('DB binding is not available in the environment');
  }
  return env.DB;
}

/**
 * D1 database schema version
 * Increment this when making schema changes
 */
export const DB_SCHEMA_VERSION = 1;

/**
 * Database tables and their schemas
 * Used for initialization and migrations
 */
export const DB_TABLES = {
  USERS: {
    name: 'users',
    schema: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        isEmailVerified BOOLEAN DEFAULT 0,
        lastLogin TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'
    ]
  },
  MAGIC_LINKS: {
    name: 'magic_links',
    schema: `
      CREATE TABLE IF NOT EXISTS magic_links (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        token TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        used BOOLEAN DEFAULT 0,
        usedAt TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token)',
      'CREATE INDEX IF NOT EXISTS idx_magic_links_userId ON magic_links(userId)'
    ]
  }
};

/**
 * Initialize the database with the required tables and indexes
 * @param {Object} db - The D1 database instance
 * @returns {Promise<void>}
 */
export async function initializeDatabase(db) {
  try {
    // Create tables
    for (const table of Object.values(DB_TABLES)) {
      await db.prepare(table.schema).run();
      
      // Create indexes
      for (const index of table.indexes || []) {
        await db.prepare(index).run();
      }
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export default {
  getD1Client,
  DB_SCHEMA_VERSION,
  DB_TABLES,
  initializeDatabase
};
