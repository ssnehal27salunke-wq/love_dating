const mongoose = require('mongoose');
const logger = require('../utils/logger');

let mockMode = false;

async function connectMongo() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/lovemarriage_chat';
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err));
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected. Reconnecting...'));
    logger.info('✅ MongoDB connected');
  } catch (err) {
    logger.warn(`⚠️  MongoDB connection failed: ${err.message}`);
    logger.warn('   Chat will use in-memory store. Set MONGO_URI to connect.');
    mockMode = true;
  }
}

function isMongoMock() {
  return mockMode;
}

module.exports = { connectMongo, isMongoMock };
