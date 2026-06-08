const Redis = require('ioredis');
const logger = require('../utils/logger');

let client;
let mockMode = false;

// In-memory fallback when Redis isn't available
const memoryStore = new Map();

async function connectRedis() {
  const redisUrl = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;

  if (redisUrl) {
    // Upstash or managed Redis (connection string)
    try {
      client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 3 });
      await client.connect();
      client.on('error', (err) => logger.error('Redis error:', err));
      logger.info('✅ Redis connected (Upstash/Managed)');
      return;
    } catch (err) {
      logger.warn(`⚠️  Redis URL connection failed: ${err.message}`);
    }
  }

  // Try local Redis
  try {
    client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 2000)),
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
    await client.connect();
    client.on('error', (err) => logger.error('Redis error:', err));
    logger.info('✅ Redis connected (local)');
  } catch (err) {
    logger.warn(`⚠️  Redis not available: ${err.message}`);
    logger.warn('   Using in-memory cache. Set UPSTASH_REDIS_URL to connect.');
    mockMode = true;
  }
}

function getRedis() {
  if (mockMode) return null;
  if (!client) throw new Error('Redis not initialised — call connectRedis() first');
  return client;
}

// ── Cache helpers (work in both real and mock mode) ──────
async function setCache(key, value, ttlSeconds = 300) {
  const serialized = JSON.stringify(value);
  if (mockMode) {
    memoryStore.set(key, { value: serialized, expires: Date.now() + ttlSeconds * 1000 });
    return;
  }
  await client.setex(key, ttlSeconds, serialized);
}

async function getCache(key) {
  if (mockMode) {
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      memoryStore.delete(key);
      return null;
    }
    return JSON.parse(entry.value);
  }
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
}

async function deleteCache(key) {
  if (mockMode) {
    memoryStore.delete(key);
    return;
  }
  await client.del(key);
}

async function invalidatePattern(pattern) {
  if (mockMode) {
    for (const k of memoryStore.keys()) {
      if (k.includes(pattern.replace('*', ''))) memoryStore.delete(k);
    }
    return;
  }
  const keys = await client.keys(pattern);
  if (keys.length) await client.del(...keys);
}

module.exports = { connectRedis, getRedis, setCache, getCache, deleteCache, invalidatePattern };
