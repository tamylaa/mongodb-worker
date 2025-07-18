var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/shared/clients/d1Client.js
var devDb;
var D1Client = class {
  static {
    __name(this, "D1Client");
  }
  constructor(db) {
    if (db && typeof db.prepare === "function") {
      this.db = db;
    } else if (true) {
      console.warn("Running in development mode with in-memory database");
      if (!devDb) {
        const tables = {
          users: /* @__PURE__ */ new Map(),
          magic_links: /* @__PURE__ */ new Map()
        };
        devDb = { tables };
        const prepareStatement = /* @__PURE__ */ __name((sql, params = []) => {
          return {
            bind: /* @__PURE__ */ __name((...bindParams) => prepareStatement(sql, [...params, ...bindParams]), "bind"),
            all: /* @__PURE__ */ __name(async () => {
              if (sql.includes("FROM users")) {
                return { results: Array.from(tables.users.values()) };
              } else if (sql.includes("FROM magic_links")) {
                return { results: Array.from(tables.magic_links.values()) };
              }
              return { results: [] };
            }, "all"),
            run: /* @__PURE__ */ __name(async () => {
              if (sql.includes("INSERT INTO users")) {
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
              } else if (sql.includes("UPDATE users") && sql.includes("SET")) {
                const userId = params[params.length - 1];
                const user = tables.users.get(userId);
                if (user) {
                  const setClause = sql.split("SET")[1].split("WHERE")[0].trim();
                  const setFields = setClause.split(",").map((field) => field.trim().split("=")[0].trim());
                  setFields.forEach((field, index) => {
                    if (field !== "updatedAt" && index < params.length - 1) {
                      user[field] = params[index];
                    }
                  });
                  user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
                  tables.users.set(userId, user);
                  return { success: true };
                }
                return { success: false, error: "User not found" };
              } else if (sql.includes("INSERT INTO magic_links")) {
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
            }, "run"),
            first: /* @__PURE__ */ __name(async () => {
              if (sql.includes("FROM users") && (sql.includes("WHERE email = ?") || sql.includes("email = ?"))) {
                const email = params[0];
                return Array.from(tables.users.values()).find((u) => u.email === email);
              } else if (sql.includes("FROM users") && (sql.includes("WHERE id = ?") || sql.includes("id = ?"))) {
                const id = params[0];
                return tables.users.get(id);
              } else if (sql.includes("FROM magic_links") && (sql.includes("WHERE token = ?") || sql.includes("token = ?"))) {
                const token = params[0];
                return Array.from(tables.magic_links.values()).find((ml) => ml.token === token);
              } else if (sql.includes("FROM magic_links") && (sql.includes("WHERE userId = ?") || sql.includes("userId = ?"))) {
                const userId = params[0];
                return Array.from(tables.magic_links.values()).find((ml) => ml.userId === userId);
              }
              return null;
            }, "first")
          };
        }, "prepareStatement");
        devDb = {
          prepare: /* @__PURE__ */ __name((sql) => prepareStatement(sql), "prepare"),
          batch: /* @__PURE__ */ __name(async (statements) => {
            const results = [];
            const context = { results: [] };
            for (let i = 0; i < statements.length; i++) {
              const stmt = statements[i];
              try {
                if (typeof stmt === "function") {
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
                if (stmt && typeof stmt === "object" && "sql" in stmt) {
                  if (stmt.sql.includes("UPDATE magic_links") || stmt.sql.includes("magic_links") && stmt.sql.includes("SET used")) {
                    const token = stmt.params && stmt.params[0];
                    const magicLink = token && Array.from(tables.magic_links.values()).find((ml) => ml.token === token);
                    if (magicLink) {
                      magicLink.used = true;
                      magicLink.usedAt = (/* @__PURE__ */ new Date()).toISOString();
                      const result = { success: true };
                      results.push(result);
                      context.results.push(result);
                    } else {
                      const error = { success: false, error: "Magic link not found" };
                      results.push(error);
                      context.results.push(error);
                    }
                  } else if (stmt.sql.includes("INSERT INTO magic_links")) {
                    const id = stmt.params && stmt.params[0];
                    if (id) {
                      const magicLink = {
                        id,
                        userId: stmt.params[1],
                        token: stmt.params[2],
                        expiresAt: stmt.params[3],
                        used: false,
                        usedAt: null,
                        createdAt: stmt.params[4] || (/* @__PURE__ */ new Date()).toISOString()
                      };
                      tables.magic_links.set(id, magicLink);
                      const result = { success: true };
                      results.push(result);
                      context.results.push(result);
                    } else {
                      const error = { success: false, error: "Missing required fields for magic link" };
                      results.push(error);
                      context.results.push(error);
                    }
                  } else if (stmt.sql.includes("INSERT INTO users")) {
                    const id = stmt.params && stmt.params[0];
                    if (id) {
                      const user = {
                        id,
                        email: stmt.params[1],
                        name: stmt.params[2],
                        isEmailVerified: false,
                        createdAt: stmt.params[3] || (/* @__PURE__ */ new Date()).toISOString(),
                        updatedAt: stmt.params[4] || (/* @__PURE__ */ new Date()).toISOString()
                      };
                      tables.users.set(id, user);
                      const result = { success: true };
                      results.push(result);
                      context.results.push(result);
                    } else {
                      const error = { success: false, error: "Missing required fields for user" };
                      results.push(error);
                      context.results.push(error);
                    }
                  } else if (stmt.sql.includes("SELECT") && stmt.sql.includes("FROM users")) {
                    const param = stmt.params && stmt.params[0];
                    let user;
                    if (param) {
                      if (stmt.sql.includes("id = ?")) {
                        user = tables.users.get(param);
                      } else if (stmt.sql.includes("email = ?")) {
                        user = Array.from(tables.users.values()).find((u) => u.email === param);
                      }
                    }
                    const result = user ? { results: [user] } : { results: [] };
                    results.push(result);
                    context.results.push(result);
                  } else {
                    const result = { success: true };
                    results.push(result);
                    context.results.push(result);
                  }
                } else {
                  const result = { success: true };
                  results.push(result);
                  context.results.push(result);
                }
              } catch (error) {
                console.error("Error in batch operation:", error);
                const errorResult = { error: error.message, success: false };
                results.push(errorResult);
                context.results.push(errorResult);
              }
            }
            return results;
          }, "batch")
        };
      }
      this.db = devDb;
    } else {
      throw new Error("Invalid D1 database binding");
    }
  }
  /**
   * Initialize the database tables if they don't exist
   */
  async initialize() {
    try {
      if (false) {
        await initializeDatabase(this.db);
      } else {
        console.log("Skipping database initialization in development mode");
      }
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  }
  /**
   * Create a new user
   * @param {Object} userData - The user data
   * @returns {Promise<Object>} The created user
   */
  async createUser({ email, name = "" }) {
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      const result = await this.db.prepare(
        "INSERT INTO users (id, email, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)"
      ).bind(id, email, name, now, now).run();
      if (!result.success) {
        if (result.error?.message?.includes("UNIQUE constraint failed")) {
          throw new Error("User already exists");
        }
        throw new Error("Failed to create user");
      }
      return { id, email, name, isEmailVerified: false, createdAt: now, updatedAt: now };
    } catch (error) {
      console.error("Error creating user:", error);
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
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const allowedUpdates = ["name", "email", "isEmailVerified", "lastLogin"];
    const validUpdates = {};
    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        validUpdates[key] = updates[key];
      }
    });
    if (Object.keys(validUpdates).length === 0) {
      return this.findUserById(userId);
    }
    try {
      const setClause = Object.keys(validUpdates).map((key, index) => `${key} = ?`).join(", ");
      const values = [...Object.values(validUpdates), now, userId];
      const result = await this.db.prepare(
        `UPDATE users SET ${setClause}, updatedAt = ? WHERE id = ?`
      ).bind(...values).run();
      if (!result.success) {
        throw new Error("Failed to update user");
      }
      const updatedUser = await this.findUserById(userId);
      if (!updatedUser) {
        throw new Error("Failed to fetch updated user");
      }
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
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
      if (true) {
        const result = await this.db.prepare(
          "SELECT * FROM users WHERE email = ?"
        ).bind(email).all();
        return result.results && result.results.length > 0 ? result.results[0] : null;
      } else {
        const user = await this.db.prepare(
          "SELECT * FROM users WHERE email = ?"
        ).bind(email).first();
        return user || null;
      }
    } catch (error) {
      console.error("Error finding user by email:", error);
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
      if (true) {
        const result = await this.db.prepare(
          "SELECT * FROM users WHERE id = ?"
        ).bind(userId).all();
        return result.results && result.results.length > 0 ? result.results[0] : null;
      } else {
        const user = await this.db.prepare(
          "SELECT * FROM users WHERE id = ?"
        ).bind(userId).first();
        return user || null;
      }
    } catch (error) {
      console.error("Error finding user by ID:", error);
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
    const expiresAt = new Date(Date.now() + 15 * 60 * 1e3).toISOString();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let user;
    if (!userId && email) {
      user = await this.findUserByEmail(email);
      if (!user) {
        const newUserId = crypto.randomUUID();
        await this.db.prepare(
          "INSERT INTO users (id, email, name, isEmailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(
          newUserId,
          email,
          name || null,
          0,
          // isEmailVerified
          now,
          now
        ).run();
        user = await this.findUserByEmail(email);
      }
    } else if (userId) {
      user = await this.findUserById(userId);
    } else {
      throw new Error("Either userId or email must be provided");
    }
    if (!user) {
      throw new Error("Failed to find or create user");
    }
    await this.db.prepare(
      "INSERT INTO magic_links (id, userId, token, expiresAt, used, createdAt) VALUES (?, ?, ?, ?, 0, ?)"
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
      user
    };
  }
  /**
   * Verify a magic link token
   * @param {string} token - The magic link token
   * @returns {Promise<Object>} The user data if verification is successful
   */
  async verifyMagicLink(token) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      const magicLinkResult = await this.db.prepare(`
        SELECT * FROM magic_links 
        WHERE token = ? AND used = 0 AND expiresAt > ?
      `).bind(token, now).all();
      if (!magicLinkResult.results || !magicLinkResult.results.length) {
        throw new Error("Invalid or expired token");
      }
      const magicLink = magicLinkResult.results[0];
      const userId = magicLink.userId;
      const user = await this.findUserById(userId);
      if (!user) {
        throw new Error("User not found");
      }
      await this.db.prepare(`
        UPDATE magic_links 
        SET used = 1, usedAt = ? 
        WHERE id = ?
      `).bind(now, magicLink.id).run();
      await this.db.prepare(`
        UPDATE users 
        SET lastLogin = ?, updatedAt = ?, isEmailVerified = 1 
        WHERE id = ?
      `).bind(now, now, userId).run();
      return await this.findUserById(userId);
    } catch (error) {
      console.error("Error verifying magic link:", error);
      throw error;
    }
  }
};

// src/worker/utils/response.js
function jsonResponse(data, status = 200, headers = {}) {
  const defaultHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        ...defaultHeaders,
        ...headers
      }
    }
  );
}
__name(jsonResponse, "jsonResponse");

// src/worker/utils/token.js
async function generateToken(payload, secret, expiresIn = "7d") {
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }
  let expiresInMs = 7 * 24 * 60 * 60 * 1e3;
  if (expiresIn) {
    const value = parseInt(expiresIn);
    if (expiresIn.endsWith("d")) {
      expiresInMs = value * 24 * 60 * 60 * 1e3;
    } else if (expiresIn.endsWith("h")) {
      expiresInMs = value * 60 * 60 * 1e3;
    } else if (expiresIn.endsWith("m")) {
      expiresInMs = value * 60 * 1e3;
    } else if (expiresIn.endsWith("s")) {
      expiresInMs = value * 1e3;
    } else {
      expiresInMs = value;
    }
  }
  const header = {
    alg: "HS256",
    // HMAC-SHA256
    typ: "JWT"
  };
  const now = Math.floor(Date.now() / 1e3);
  const exp = Math.floor((Date.now() + expiresInMs) / 1e3);
  const data = {
    ...payload,
    iat: now,
    exp
  };
  const base64UrlEncode = /* @__PURE__ */ __name((obj) => {
    const str = JSON.stringify(obj);
    const encoder2 = new TextEncoder();
    const data2 = encoder2.encode(str);
    return btoa(String.fromCharCode(...new Uint8Array(data2))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }, "base64UrlEncode");
  const encodedHeader = base64UrlEncode(header);
  const encodedData = base64UrlEncode(data);
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(`${encodedHeader}.${encodedData}`)
  );
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encodedHeader}.${encodedData}.${signatureBase64}`;
}
__name(generateToken, "generateToken");
async function verifyToken(token, secret) {
  if (!token) {
    throw new Error("No token provided");
  }
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }
  const [encodedHeader, encodedData, signature] = token.split(".");
  if (!encodedHeader || !encodedData || !signature) {
    throw new Error("Invalid token format");
  }
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const signatureBytes = new Uint8Array(
    atob(signature.replace(/-/g, "+").replace(/_/g, "/")).split("").map((c) => c.charCodeAt(0))
  );
  const data = encoder.encode(`${encodedHeader}.${encodedData}`);
  const isValid = await crypto.subtle.verify(
    "HMAC",
    cryptoKey,
    signatureBytes,
    data
  );
  if (!isValid) {
    throw new Error("Invalid token signature");
  }
  const base64UrlDecode = /* @__PURE__ */ __name((str) => {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) {
      str += "=";
    }
    const binaryString = atob(str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  }, "base64UrlDecode");
  const payload = base64UrlDecode(encodedData);
  const now = Math.floor(Date.now() / 1e3);
  if (payload.exp && payload.exp < now) {
    throw new Error("Token expired");
  }
  return payload;
}
__name(verifyToken, "verifyToken");

// src/worker/handlers/auth.js
async function handleAuth(request, d1Client2, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/auth", "");
  try {
    if (path === "/magic-link" && request.method === "POST") {
      return await handleMagicLink(request, d1Client2, env);
    } else if (path === "/verify" && request.method === "POST") {
      return await handleVerifyMagicLink(request, d1Client2, env);
    } else if (path === "/me" && request.method === "GET") {
      return await handleGetCurrentUser(request, d1Client2, env);
    }
    return jsonResponse({ error: "Not Found" }, 404);
  } catch (error) {
    console.error("Auth error:", error);
    return jsonResponse(
      { error: "Authentication failed", message: error.message },
      error.statusCode || 500
    );
  }
}
__name(handleAuth, "handleAuth");
async function handleMagicLink(request, d1Client2, env) {
  const { email, name } = await request.json();
  if (!email) {
    throw { statusCode: 400, message: "Email is required" };
  }
  const { token, expiresAt, user } = await d1Client2.createMagicLink({
    email,
    name
  });
  const magicLink = `${new URL(request.url).origin}/auth/verify?token=${token}`;
  return jsonResponse({
    success: true,
    message: "Magic link generated",
    // In production, you wouldn't return the magic link
    // but for development, it's helpful to see it
    magicLink: true ? magicLink : void 0,
    expiresAt
  });
}
__name(handleMagicLink, "handleMagicLink");
async function handleVerifyMagicLink(request, d1Client2, env) {
  const { token } = await request.json();
  if (!token) {
    throw { statusCode: 400, message: "Token is required" };
  }
  const user = await d1Client2.verifyMagicLink(token);
  const authToken = await generateToken(
    { userId: user.id, email: user.email },
    env.JWT_SECRET,
    "7d"
    // 7 days expiration
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
__name(handleVerifyMagicLink, "handleVerifyMagicLink");
async function handleGetCurrentUser(request, d1Client2, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw { statusCode: 401, message: "Unauthorized" };
  }
  const token = authHeader.split(" ")[1];
  const decoded = await verifyToken(token, env.JWT_SECRET);
  const user = await d1Client2.findUserById(decoded.userId);
  if (!user) {
    throw { statusCode: 404, message: "User not found" };
  }
  return jsonResponse({
    id: user.id,
    email: user.email,
    name: user.name,
    isEmailVerified: user.isEmailVerified,
    lastLogin: user.lastLogin
  });
}
__name(handleGetCurrentUser, "handleGetCurrentUser");

// src/worker/handlers/users.js
async function handleUsers(request, d1Client2, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/users", "");
  const userId = path.split("/")[1];
  try {
    if (request.method === "GET") {
      if (path === "" || path === "/") {
        return await listUsers(d1Client2);
      } else if (userId) {
        return await getUser(userId, d1Client2);
      }
    } else if (request.method === "POST" && (path === "" || path === "/")) {
      return await createUser(request, d1Client2);
    } else if (request.method === "PUT" && userId) {
      return await updateUser(request, userId, d1Client2);
    } else if (request.method === "DELETE" && userId) {
      return await deleteUser(userId, d1Client2);
    }
    return jsonResponse({ error: "Not Found" }, 404);
  } catch (error) {
    console.error("User handler error:", error);
    return jsonResponse(
      { error: "User operation failed", message: error.message },
      error.statusCode || 500
    );
  }
}
__name(handleUsers, "handleUsers");
async function listUsers(d1Client2) {
  const users = await d1Client2.db.prepare(
    "SELECT id, email, name, isEmailVerified, lastLogin, createdAt, updatedAt FROM users ORDER BY createdAt DESC LIMIT 100"
  ).all();
  return jsonResponse(users.results || []);
}
__name(listUsers, "listUsers");
async function getUser(userId, d1Client2) {
  const user = await d1Client2.findUserById(userId);
  if (!user) {
    throw { statusCode: 404, message: "User not found" };
  }
  const { password, ...userData } = user;
  return jsonResponse(userData);
}
__name(getUser, "getUser");
async function createUser(request, d1Client2) {
  const { email, name, password } = await request.json();
  if (!email) {
    throw { statusCode: 400, message: "Email is required" };
  }
  const user = await d1Client2.createUser({ email, name });
  return jsonResponse(user, 201);
}
__name(createUser, "createUser");
async function updateUser(request, userId, d1Client2) {
  const updates = await request.json();
  if (!updates || Object.keys(updates).length === 0) {
    throw { statusCode: 400, message: "No updates provided" };
  }
  try {
    const updatedUser = await d1Client2.updateUser(userId, updates);
    if (!updatedUser) {
      throw { statusCode: 404, message: "User not found" };
    }
    const { password, ...userData } = updatedUser;
    return jsonResponse(userData);
  } catch (error) {
    console.error("Error updating user:", error);
    throw { statusCode: error.statusCode || 500, message: error.message };
  }
}
__name(updateUser, "updateUser");
async function deleteUser(userId, d1Client2) {
  const result = await d1Client2.db.prepare(
    "DELETE FROM users WHERE id = ? RETURNING id"
  ).bind(userId).run();
  if (!result.results.length) {
    throw { statusCode: 404, message: "User not found" };
  }
  return jsonResponse({ success: true, message: "User deleted" });
}
__name(deleteUser, "deleteUser");

// src/worker/handlers/health.js
async function handleHealth(d1Client2, env) {
  const status = {
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    environment: env.NODE_ENV || "development",
    services: {
      database: "ok"
    }
  };
  try {
    if (false) {
      try {
        await d1Client2.db.prepare("SELECT 1").run();
      } catch (dbError) {
        console.error("Database health check failed:", dbError);
        status.status = "degraded";
        status.services.database = "unavailable";
        status.databaseError = dbError.message;
      }
    } else {
      status.services.database = "development (in-memory)";
    }
    return new Response(
      JSON.stringify(status, null, 2),
      {
        status: status.status === "ok" ? 200 : 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        error: "Health check failed",
        message: error.message,
        environment: "development"
      }, null, 2),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      }
    );
  }
}
__name(handleHealth, "handleHealth");

// src/worker/index.js
var d1Client;
var index_default = {
  async fetch(request, env, ctx) {
    try {
      if (!d1Client) {
        try {
          if (env.NODE_ENV !== "production" || !env.DB) {
            console.warn(`Running in ${env.NODE_ENV || "development"} mode with ${env.DB ? "D1 binding available" : "no D1 binding"}`);
            d1Client = new D1Client(env.DB || {});
          } else {
            d1Client = new D1Client(env.DB);
          }
          await d1Client.initialize();
        } catch (error) {
          console.error("Failed to initialize D1 client:", error);
          return new Response(
            JSON.stringify({
              success: false,
              error: "Database initialization failed",
              message: error.message
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" }
            }
          );
        }
      }
      const url = new URL(request.url);
      const path = url.pathname;
      if (path.startsWith("/api/auth")) {
        return handleAuth(request, d1Client, env);
      } else if (path.startsWith("/api/users")) {
        return handleUsers(request, d1Client, env);
      }
      if (path === "/health") {
        return handleHealth(d1Client, env);
      }
      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("Error handling request:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Internal Server Error",
          message: error.message
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
