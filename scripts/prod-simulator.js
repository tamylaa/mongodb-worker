import dotenv from 'dotenv';
import { startServer } from '../api/server.js';

dotenv.config();

// Set production environment
process.env.NODE_ENV = 'production';

// Start the server
startServer();
