/**
 * @deprecated This MongoDB HTTP client is no longer in use.
 * The application has been migrated to use Cloudflare D1 database.
 * This file is kept for reference only and can be safely removed in future versions.
 * 
 * MongoDB HTTP Client for Cloudflare Workers
 * Handles communication with MongoDB Data API
 */

console.warn('DEPRECATED: MongoDB HTTP client is no longer in use. Migrate to D1 client.');

export class MongoDBHttpClient {
  constructor(appId, apiKey, dataSource = 'tamylaauth', database = 'tamyla-auth', region = 'ap-south-1') {
    // Updated to use the latest MongoDB Data API endpoint format with configurable region
    this.baseUrl = `https://${region}.data.mongodb-api.com/app/${appId}/endpoint/data/v1`;
    this.apiKey = apiKey;
    this.dataSource = dataSource;
    this.database = database;
    this.collection = 'users'; // Default collection
  }

  async request(action, document = {}, options = {}) {
    const url = `${this.baseUrl}/action/${action}`;
    console.log(`[MongoDB] Making request to: ${url}`);
    
    const headers = {
      'Content-Type': 'application/json',
      'api-key': this.apiKey,
      'Access-Control-Request-Headers': '*',
      ...options.headers,
    };

    const requestBody = {
      dataSource: this.dataSource,
      database: this.database,
      collection: options.collection || this.collection,
      ...document
    };
    
    console.log(`[MongoDB] Request body:`, JSON.stringify(requestBody, null, 2));

    try {
      const requestData = {
        ...requestBody,
        ...(action === 'findOne' && { projection: options.projection || {} }),
        ...(action === 'find' && { 
          projection: options.projection || {},
          sort: options.sort || { _id: 1 },
          limit: options.limit || 1000
        }),
        ...(action === 'updateOne' && {
          filter: document.filter || {},
          update: document.update || { $set: document.update?.$set || {} },
          upsert: document.upsert || false
        }),
        ...(action === 'insertOne' && {
          document: document.document || {}
        }),
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('[MongoDB] Error response:', JSON.stringify(errorData, null, 2));
        } catch (e) {
          errorData = { message: 'Failed to parse error response' };
          console.error('[MongoDB] Failed to parse error response:', e);
        }
        
        const errorMessage = `MongoDB Data API request failed: ${errorData.message || response.statusText} (Status: ${response.status})`;
        console.error(`[MongoDB] ${errorMessage}`);
        console.error(`[MongoDB] Response headers:`, Object.fromEntries(response.headers.entries()));
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('MongoDB Data API request failed:', error);
      throw error;
    }
  }

  // User methods
  async findUserById(userId) {
    const result = await this.request('findOne', {
      filter: { _id: { $oid: userId } }
    });
    return { data: result.document };
  }

  async findUserByEmail(email) {
    const result = await this.request('findOne', {
      filter: { email }
    });
    return { data: result.document };
  }

  async createUser(userData) {
    const result = await this.request('insertOne', {
      document: {
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        magicLinks: []
      }
    });
    return { data: { _id: result.insertedId, ...userData } };
  }

  async updateUser(userId, updates) {
    const result = await this.request('updateOne', {
      filter: { _id: { $oid: userId } },
      update: {
        $set: {
          ...updates,
          updatedAt: new Date().toISOString()
        }
      },
      upsert: false
    });
    
    if (result.matchedCount === 0) {
      throw new Error('User not found');
    }
    
    return { data: { _id: userId, ...updates } };
  }

  // Magic link methods
  async createMagicLink({ userId, email, name }) {
    // First, find or create the user
    let user;
    
    if (userId) {
      const result = await this.findUserById(userId);
      user = result.data;
    } else if (email) {
      const result = await this.findUserByEmail(email);
      user = result.data;
      
      if (!user) {
        // Create new user if not found
        const newUser = await this.createUser({ email, name: name || '' });
        user = newUser.data;
      }
    } else {
      throw new Error('Either userId or email is required');
    }
    
    // Generate magic link token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
    
    // Add magic link to user's magicLinks array
    await this.request('updateOne', {
      filter: { _id: { $oid: user._id } },
      update: {
        $push: {
          magicLinks: {
            token,
            expiresAt,
            used: false,
            createdAt: new Date().toISOString()
          }
        }
      }
    });
    
    return { 
      data: {
        userId: user._id,
        token,
        expiresAt
      }
    };
  }

  async verifyMagicLink(token) {
    // Find user with this token
    const result = await this.request('findOne', {
      filter: {
        'magicLinks.token': token,
        'magicLinks.used': false,
        'magicLinks.expiresAt': { $gt: new Date().toISOString() }
      }
    });
    
    const user = result.document;
    if (!user) {
      throw new Error('Invalid or expired token');
    }
    
    // Mark token as used
    await this.request('updateOne', {
      filter: { 
        _id: { $oid: user._id },
        'magicLinks.token': token
      },
      update: {
        $set: {
          'magicLinks.$.used': true,
          'magicLinks.$.usedAt': new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }
      }
    });
    
    // Generate session token (in a real app, use JWT or similar)
    const sessionToken = crypto.randomUUID();
    
    return {
      data: {
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        sessionToken
      }
    };
  }
}

// Create a function to get a client instance with environment variables from the request
export function getMongoDBClient(request) {
  const env = request?.env || process.env || {};
  return new MongoDBHttpClient(
    env.MONGODB_APP_ID || 'your-app-id',
    env.MONGODB_API_KEY || 'your-api-key',
    env.MONGODB_DATA_SOURCE || 'tamylaauth',
    env.MONGODB_DATABASE || 'tamyla-auth',
    env.MONGODB_REGION || 'ap-south-1'
  );
}
