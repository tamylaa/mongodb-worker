# Tamyla Data Service

This project provides a Cloudflare Worker-based data orchestration layer with D1 database integration. It serves as a central data access and processing service for Tamyla applications.

## Project Structure

```
.
├── src/                  # Source code
│   ├── worker/          # Cloudflare Worker implementation
│   │   ├── handlers/    # Request handlers
│   │   │   ├── auth.js  # Authentication endpoints
│   │   │   └── users.js # User management endpoints
│   │   └── index.js     # Main worker entry point
│   └── shared/          # Shared utilities and clients
│       └── clients/     # Database clients
│           └── d1Client.js  # D1 database client
├── wrangler.toml        # Cloudflare Workers configuration
├── .dev.vars            # Development environment variables
└── package.json         # Project dependencies and scripts
│       ├── server.js    # Express server entry point
│       ├── routes/      # Express routes
│       ├── controllers/ # Route controllers
│       └── models/      # Database models
│
├── scripts/             # Utility scripts
├── .env                 # Environment variables (for Express)
└── package.json         # Project configuration and scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB Atlas account (for database)
- Cloudflare account (for Cloudflare Worker deployment)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and update with your configuration

## Running the Express Server

```bash
# Development mode with hot-reload
npm run express:dev

# Production build
npm run express:build
npm start

# Run tests
npm test
```

## Running the Cloudflare Worker

```bash
# Local development
npm run worker:dev

# Deploy to Cloudflare Workers
npm run worker:deploy           # Preview environment
npm run worker:deploy:staging   # Staging environment
npm run worker:deploy:prod      # Production environment
```

## Environment Variables

Create a `.env` file in the root directory for Express and `.dev.vars` in the `cloudflare` directory for local Cloudflare Worker development.

### Common Variables

```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
```

### Cloudflare Worker Specific

```
# In cloudflare/.dev.vars
MONGODB_WORKER_URL=your_mongodb_worker_url
MONGODB_WORKER_API_KEY=your_api_key
```

## Deployment

### Express

Deploy the Express server to your preferred hosting provider (e.g., Heroku, Railway, etc.).

### Cloudflare Worker

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   npx wrangler login
   ```

3. Deploy:
   ```bash
   npm run worker:deploy:prod
   ```

## License

MIT
