const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Supports: Supabase, Neon.tech, or local PostgreSQL
// Falls back gracefully if no DB is configured
let sequelize;
let mockMode = false;

try {
  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    // Production: Use connection string (Supabase / Neon)
    sequelize = new Sequelize(dbUrl, {
      dialect: 'postgres',
      logging: (sql) => logger.debug(sql),
      pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false },
      },
      define: {
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    });
  } else {
    // Local development
    sequelize = new Sequelize({
      dialect: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB || 'lovemarriage',
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      logging: (sql) => logger.debug(sql),
      pool: { max: 20, min: 5, acquire: 30000, idle: 10000 },
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production'
          ? { require: true, rejectUnauthorized: false }
          : false,
      },
      define: {
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    });
  }
} catch (err) {
  logger.warn('PostgreSQL config failed, running in mock mode:', err.message);
  mockMode = true;
}

async function connectPostgres() {
  if (mockMode) {
    logger.warn('⚠️  PostgreSQL running in MOCK mode (no real DB connected)');
    logger.warn('   Set DATABASE_URL or POSTGRES_* env vars to connect.');
    return;
  }
  try {
    await sequelize.authenticate();
    logger.info('✅ PostgreSQL connected');

    // Auto-sync in development (creates tables if they don't exist)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      logger.info('✅ PostgreSQL schema synced');
    }
  } catch (err) {
    logger.warn(`⚠️  PostgreSQL connection failed: ${err.message}`);
    logger.warn('   Running in MOCK mode. Auth will use in-memory store.');
    mockMode = true;
  }
}

function isMockMode() {
  return mockMode;
}

module.exports = { sequelize, connectPostgres, isMockMode };
