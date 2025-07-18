/**
 * D1 Database Client
 * Provides an interface for interacting with Cloudflare D1
 */

import { initializeDatabase } from '../../config/d1.config.js';

// In-memory database for development
let devDb;

// Reset the in-memory database (for testing)
export function resetDevDb() {
  if (devDb) {
    devDb.tables = {
      users: new Map(),
      magic_links: new Map()
    };
  }
  return devDb;
}

export class D1Client {
  constructor(db) {
    // Handle both direct D1 binding and development environment
    if (db && typeof db.prepare === 'function') {
      this.db = db;
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('Running in development mode with in-memory database');
      if (!devDb) {
        // Initialize in-memory database
        const tables = {
          users: new Map(),
          magic_links: new Map()
        };
        
        // Store tables reference for external access in tests
        devDb = { tables };
        
        const prepareStatement = (sql, params = []) => {
          return {
            bind: (...bindParams) => prepareStatement(sql, [...params, ...bindParams]),
            all: async () => {
              // Handle SELECT queries
              if (sql.includes('FROM users')) {
                return { results: Array.from(tables.users.values()) };
              } else if (sql.includes('FROM magic_links')) {
                return { results: Array.from(tables.magic_links.values()) };
              }
              return { results: [] };
            },
            run: async () => {
              // Handle INSERT queries
              if (sql.includes('INSERT INTO users')) {
                const id = params[0];
                const user = {
                  id,
                  email: params[1],
                  name: params[2],
                  isEmailVerified: false,
                  createdAt: params[3],
                  updatedAt: params[4]
                };
                tables.users.set(id, user);
                return { success: true };
              } 
              // Handle UPDATE queries
              else if (sql.includes('UPDATE users') && sql.includes('SET')) {
                const userId = params[params.length - 1]; // Last param is the user ID (from WHERE id = ?)
                const user = tables.users.get(userId);
                
                if (user) {
                  // Parse the SET clause to get the field names
                  const setClause = sql.split('SET')[1].split('WHERE')[0].trim();
                  const setFields = setClause.split(',').map(field => field.trim().split('=')[0].trim());
                  
                  // Update each field in the user object
                  setFields.forEach((field, index) => {
                    if (field !== 'updatedAt' && index < params.length - 1) { // Skip updatedAt and the ID param
                      user[field] = params[index];
                    }
                  });
                  
                  // Always update the updatedAt field
                  user.updatedAt = new Date().toISOString();
                  
                  // Save the updated user
                  tables.users.set(userId, user);
                  return { success: true };
                }
                return { success: false, error: 'User not found' };
              }
              // Handle magic links
              else if (sql.includes('INSERT INTO magic_links')) {
                const id = params[0];
                const magicLink = {
                  id,
                  userId: params[1],
                  token: params[2],
                  expiresAt: params[3],
                  used: false,
                  usedAt: null,
                  createdAt: params[4]
                };
                tables.magic_links.set(id, magicLink);
                return { success: true };
              }
              return { success: true };
            },
            first: async () => {
              // Handle SELECT ... LIMIT 1
              if (sql.includes('FROM users') && (sql.includes('WHERE email = ?') || sql.includes('email = ?'))) {
                const email = params[0];
                return Array.from(tables.users.values()).find(u => u.email === email);
              } else if (sql.includes('FROM users') && (sql.includes('WHERE id = ?') || sql.includes('id = ?'))) {
                const id = params[0];
                return tables.users.get(id);
              } else if (sql.includes('FROM magic_links') && (sql.includes('WHERE token = ?') || sql.includes('token = ?'))) {
                const token = params[0];
                return Array.from(tables.magic_links.values()).find(ml => ml.token === token);
              } else if (sql.includes('FROM magic_links') && (sql.includes('WHERE userId = ?') || sql.includes('userId = ?'))) {
                const userId = params[0];
                return Array.from(tables.magic_links.values()).find(ml => ml.userId === userId);
              }
              return null;
            }
          };
        };
        
        devDb = {
          prepare: (sql) => prepareStatement(sql),
          batch: async (statements) => {
            const results = [];
            const context = { results: [] };
            
            for (let i = 0; i < statements.length; i++) {
              const stmt = statements[i];
              
              try {
                // Handle function statements (for dependent queries)
                if (typeof stmt === 'function') {
                  // Pass a proxy that tracks results
                  const result = await stmt({
                    ...context,
                    get results() {
                      return context.results;
                    }
                  });
                  results.push(result);
                  context.results = [...context.results, result];
                  continue;
                }
                
                // Handle prepared statements
                if (stmt && typeof stmt === 'object' && 'sql' in stmt) {
                  if (stmt.sql.includes('UPDATE magic_links') || 
                      (stmt.sql.includes('magic_links') && stmt.sql.includes('SET used'))) {
                    // Handle magic link updates (e.g., marking as used)
                    const token = stmt.params && stmt.params[0];
                    const magicLink = token && Array.from(tables.magic_links.values())
                      .find(ml => ml.token === token);
                    
                    if (magicLink) {
                      magicLink.used = true;
                      magicLink.usedAt = new Date().toISOString();
                      const result = { success: true };
                      results.push(result);
                      context.results.push(result);
                    } else {
                      const error = { success: false, error: 'Magic link not found' };
                      results.push(error);
                      context.results.push(error);
                    }
                  } else if (stmt.sql.includes('INSERT INTO magic_links')) {
                    // Handle magic link insertion
                    const id = stmt.params && stmt.params[0];
                    if (id) {
                      const magicLink = {
                        id,
                        userId: stmt.params[1],
                        token: stmt.params[2],
                        expiresAt: stmt.params[3],
                        used: false,
                        usedAt: null,
                        createdAt: stmt.params[4] || new Date().toISOString()
                      };
                      tables.magic_links.set(id, magicLink);
                      const result = { success: true };
                      results.push(result);
                      context.results.push(result);
                    } else {
                      const error = { success: false, error: 'Missing required fields for magic link' };
                      results.push(error);
                      context.results.push(error);
                    }
                  } else if (stmt.sql.includes('INSERT INTO users')) {
                    // Handle user insertion
                    const id = stmt.params && stmt.params[0];
                    if (id) {
                      const user = {
                        id,
                        email: stmt.params[1],
                        name: stmt.params[2],
                        isEmailVerified: false,
                        createdAt: stmt.params[3] || new Date().toISOString(),
                        updatedAt: stmt.params[4] || new Date().toISOString()
                      };
                      tables.users.set(id, user);
                      const result = { success: true };
                      results.push(result);
                      context.results.push(result);
                    } else {
                      const error = { success: false, error: 'Missing required fields for user' };
                      results.push(error);
                      context.results.push(error);
                    }
                  } else if (stmt.sql.includes('SELECT') && stmt.sql.includes('FROM users')) {
                    // Handle user selection
                    const param = stmt.params && stmt.params[0];
                    let user;
                    
                    if (param) {
                      if (stmt.sql.includes('id = ?')) {
                        user = tables.users.get(param);
                      } else if (stmt.sql.includes('email = ?')) {
                        user = Array.from(tables.users.values()).find(u => u.email === param);
                      }
                    }
                    
                    const result = user ? { results: [user] } : { results: [] };
                    results.push(result);
                    context.results.push(result);
                  } else {
                    // For other statements, just return success
                    const result = { success: true };
                    results.push(result);
                    context.results.push(result);
                  }
                } else {
                  // For non-SQL statements, just return success
                  const result = { success: true };
                  results.push(result);
                  context.results.push(result);
                }
              } catch (error) {
                console.error('Error in batch operation:', error);
                const errorResult = { error: error.message, success: false };
                results.push(errorResult);
                context.results.push(errorResult);
              }
            }
            
            return results;
          }
        };
      }
      this.db = devDb;
    } else {
      throw new Error('Invalid D1 database binding');
    }
  }

  /**
   * Initialize the database tables if they don't exist
   */
  async initialize() {
    try {
      if (process.env.NODE_ENV !== 'development') {
        await initializeDatabase(this.db);
      } else {
        console.log('Skipping database initialization in development mode');
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   * @param {Object} userData - The user data
   * @returns {Promise<Object>} The created user
   */
  async createUser({ email, name = '' }) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    try {
      const result = await this.db.prepare(
        'INSERT INTO users (id, email, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)'
      ).bind(id, email, name, now, now).run();
      
      if (!result.success) {
        if (result.error?.message?.includes('UNIQUE constraint failed')) {
          throw new Error('User already exists');
        }
        throw new Error('Failed to create user');
      }
      
      return { id, email, name, isEmailVerified: false, createdAt: now, updatedAt: now };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing user
   * @param {string} userId - The ID of the user to update
   * @param {Object} updates - The fields to update
   * @returns {Promise<Object>} The updated user
   */
  async updateUser(userId, updates) {
    const now = new Date().toISOString();
    const allowedUpdates = ['name', 'email', 'isEmailVerified', 'lastLogin'];
    const validUpdates = {};
    
    // Filter out any invalid updates
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        validUpdates[key] = updates[key];
      }
    });
    
    // If no valid updates, return the current user
    if (Object.keys(validUpdates).length === 0) {
      return this.findUserById(userId);
    }
    
    try {
      // Build the SET clause for the SQL query
      const setClause = Object.keys(validUpdates)
        .map((key, index) => `${key} = ?`)
        .join(', ');
      
      // Add updatedAt to the updates
      const values = [...Object.values(validUpdates), now, userId];
      
      // Execute the update
      const result = await this.db.prepare(
        `UPDATE users SET ${setClause}, updatedAt = ? WHERE id = ?`
      ).bind(...values).run();
      
      if (!result.success) {
        throw new Error('Failed to update user');
      }
      
      // Return the updated user
      const updatedUser = await this.findUserById(userId);
      if (!updatedUser) {
        throw new Error('Failed to fetch updated user');
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Find a user by email
   * @param {string} email - The email address
   * @returns {Promise<Object|null>} The user or null if not found
   */
  async findUserByEmail(email) {
    try {
      if (process.env.NODE_ENV === 'development') {
        const result = await this.db.prepare(
          'SELECT * FROM users WHERE email = ?'
        ).bind(email).all();
        return result.results && result.results.length > 0 ? result.results[0] : null;
      } else {
        const user = await this.db.prepare(
          'SELECT * FROM users WHERE email = ?'
        ).bind(email).first();
        return user || null;
      }
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find a user by ID
   * @param {string} userId - The user ID
   * @returns {Promise<Object|null>} The user or null if not found
   */
  async findUserById(userId) {
    try {
      if (process.env.NODE_ENV === 'development') {
        const result = await this.db.prepare(
          'SELECT * FROM users WHERE id = ?'
        ).bind(userId).all();
        return result.results && result.results.length > 0 ? result.results[0] : null;
      } else {
        const user = await this.db.prepare(
          'SELECT * FROM users WHERE id = ?'
        ).bind(userId).first();
        return user || null;
      }
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new magic link
   * @param {Object} magicLinkData - The magic link data
   * @returns {Promise<Object>} The created magic link
   */
  async createMagicLink({ userId, email, name }) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
    const now = new Date().toISOString();
    
    let user;
    
    // If we only have email, first try to get the user by email
    if (!userId && email) {
      user = await this.findUserByEmail(email);
      
      // If user doesn't exist, create a new one
      if (!user) {
        const newUserId = crypto.randomUUID();
        await this.db.prepare(
          'INSERT INTO users (id, email, name, isEmailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(
          newUserId,
          email,
          name || null,
          0, // isEmailVerified
          now,
          now
        ).run();
        
        // Get the newly created user
        user = await this.findUserByEmail(email);
      }
    } else if (userId) {
      // If we have a userId, get the user by ID
      user = await this.findUserById(userId);
    } else {
      throw new Error('Either userId or email must be provided');
    }
    
    if (!user) {
      throw new Error('Failed to find or create user');
    }
    
    // Insert the magic link
    await this.db.prepare(
      'INSERT INTO magic_links (id, userId, token, expiresAt, used, createdAt) VALUES (?, ?, ?, ?, 0, ?)'
    ).bind(
      crypto.randomUUID(),
      user.id,
      token,
      expiresAt,
      now
    ).run();
    
    return {
      userId: user.id,
      token,
      expiresAt,
      user: user
    };
  }

  /**
   * Verify a magic link token
   * @param {string} token - The magic link token
   * @returns {Promise<Object>} The user data if verification is successful
   */
  async verifyMagicLink(token) {
    const now = new Date().toISOString();
    
    try {
      // First, find and mark the magic link as used
      const magicLinkResult = await this.db.prepare(`
        SELECT * FROM magic_links 
        WHERE token = ? AND used = 0 AND expiresAt > ?
      `).bind(token, now).all();
      
      if (!magicLinkResult.results || !magicLinkResult.results.length) {
        throw new Error('Invalid or expired token');
      }
      
      const magicLink = magicLinkResult.results[0];
      const userId = magicLink.userId;
      
      // Find the user first to ensure they exist
      const user = await this.findUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Mark the magic link as used
      await this.db.prepare(`
        UPDATE magic_links 
        SET used = 1, usedAt = ? 
        WHERE id = ?
      `).bind(now, magicLink.id).run();
      
      // Update user's last login and verification status
      await this.db.prepare(`
        UPDATE users 
        SET lastLogin = ?, updatedAt = ?, isEmailVerified = 1 
        WHERE id = ?
      `).bind(now, now, userId).run();
      
      // Return the updated user
      return await this.findUserById(userId);
    } catch (error) {
      console.error('Error verifying magic link:', error);
      throw error;
    }
  }
}
