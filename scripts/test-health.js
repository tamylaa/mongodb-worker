import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_WORKER_URL = process.env.MONGODB_WORKER_URL || 'http://localhost:3002';

async function testHealth() {
  try {
    console.log(`Testing health endpoint at ${MONGODB_WORKER_URL}/health`);
    
    const response = await axios.get(`${MONGODB_WORKER_URL}/health`);
    
    if (response.status === 200 && response.data.status === 'ok') {
      console.log('✅ Health check passed!');
      console.log('MongoDB status:', response.data.mongo);
      console.log('Environment:', response.data.environment);
      return true;
    } else {
      console.error('❌ Health check failed:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    return false;
  }
}

// Run the test
testHealth();
