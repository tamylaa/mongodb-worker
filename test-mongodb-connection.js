const { MongoClient } = require('mongodb');

async function testConnection() {
  const uri = "mongodb+srv://tamyla_auth_master:Tamyla01May2025@tamylaauth.lqbn0xw.mongodb.net/tamyla-auth?retryWrites=true&w=majority&appName=tamylaauth";
  
  const client = new MongoClient(uri);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test a simple query
    const db = client.db('tamyla-auth');
    const collections = await db.listCollections().toArray();
    console.log('📂 Collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

testConnection();