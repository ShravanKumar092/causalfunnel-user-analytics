const mongoose = require('mongoose');

let memoryServerInstance = null;

/**
 * Connect to MongoDB with support for MongoDB Atlas, local MongoDB,
 * or an isolated in-memory database for automated tests only.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri && process.env.NODE_ENV !== 'test') {
    throw new Error('MONGODB_URI is required outside the test environment.');
  }

  try {
    if (uri && process.env.NODE_ENV !== 'test') {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000
      });
      console.log(`[MongoDB] Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    }
  } catch (error) {
    console.error(`[MongoDB] Connection failed: ${error.name}`);

    throw error;
  }

  // Isolated ephemeral MongoDB is only used by automated tests.
  if (process.env.NODE_ENV === 'test') {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServerInstance = await MongoMemoryServer.create();
    const memUri = memoryServerInstance.getUri();
    const conn = await mongoose.connect(memUri);
    console.log(`[MongoDB] Test In-Memory MongoDB running at: ${memUri}`);
    return conn;
  }
};

/**
 * Disconnect from MongoDB and stop memory server if running
 */
const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
      memoryServerInstance = null;
    }
  } catch (err) {
    console.error('[MongoDB] Error during disconnect:', err.message);
  }
};

module.exports = {
  connectDB,
  disconnectDB
};
