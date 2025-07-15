# MongoDB Worker Deployment Guide

This guide explains how to deploy and test the MongoDB Worker service.

## Prerequisites

- Node.js 16+
- MongoDB Atlas account and cluster
- Cloudflare account with Workers enabled
- Wrangler CLI (`npm install -g wrangler`)

## Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   Create a `.env` file in the project root:
   ```env
   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
   
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # Security
   JWT_SECRET=your-jwt-secret
   API_KEYS=your-api-key-1,your-api-key-2
   
   # CORS
   FRONTEND_URL=http://localhost:3000
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

## Testing

Run the test script to verify all functionality:

```bash
node test-mongodb-worker.js
```

## Deployment to Cloudflare Workers

### 1. Build for Production

```bash
npm run build
```

### 2. Configure Wrangler

1. Login to Cloudflare:
   ```bash
   wrangler login
   ```

2. Create a new Worker project:
   ```bash
   wrangler init mongodb-worker
   ```

3. Configure `wrangler.toml`:
   ```toml
   name = "mongodb-worker"
   main = "api/server.js"
   compatibility_date = "2023-07-14"
   
   [vars]
   NODE_ENV = "production"
   
   # Environment variables will be set as secrets
   ```

### 3. Set Environment Variables

Set your production environment variables as secrets:

```bash
wrangler secret put MONGODB_URI
wrangler secret put JWT_SECRET
wrangler secret put API_KEYS
```

### 4. Deploy

```bash
wrangler deploy
```

## Verifying the Deployment

1. **Check Health**
   ```bash
   curl https://mongodb-worker.<your-subdomain>.workers.dev/health
   ```

2. **Run Tests Against Production**
   ```bash
   MONGODB_WORKER_URL=https://mongodb-worker.<your-subdomain>.workers.dev \
   MONGODB_WORKER_API_KEY=your-api-key \
   node test-mongodb-worker.js
   ```

## Monitoring and Logs

View logs in the Cloudflare Workers dashboard or via CLI:

```bash
wrangler tail
```

## Updating the Worker

1. Make your changes
2. Test locally
3. Deploy updates:
   ```bash
   wrangler deploy
   ```

## Rollback

To rollback to a previous version:

```bash
wrangler rollback --message "Rollback to previous version"
```

## Security Considerations

- Always use HTTPS in production
- Rotate API keys and secrets regularly
- Monitor usage and set up alerts for suspicious activity
- Keep dependencies up to date
- Use the principle of least privilege for database access
