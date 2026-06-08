/**
 * LoveMarriage App — Production Server
 * Express + Socket.io with graceful degradation
 * Works with $0 cloud stack OR fully local (no external services required)
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const { connectPostgres } = require('./config/database');
const { connectMongo } = require('./config/mongodb');
const { connectRedis } = require('./config/redis');
const { initSocket } = require('./socket/chatSocket');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// ── Route imports ─────────────────────────────────────────
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const matchRoutes = require('./routes/matches');
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/uploads');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:3000',
      process.env.MOBILE_URL || 'exp://localhost:8081',
      '*', // Allow Expo Go in development
    ],
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
});

// ── Global Middleware ──────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: '*', // Permissive in dev; lock down in production
  credentials: true,
}));
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate Limiting ──────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  message: { error: 'Too many requests. Please slow down.' },
});
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many auth attempts. Try again later.' },
});
app.use('/api/', globalLimiter);
app.use('/api/auth/', authLimiter);

// ── Health Check ──────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor(process.uptime()),
  });
});

// ── API Routes ────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/uploads', uploadRoutes);

// ── 404 Handler ───────────────────────────────────────────
app.use('{*path}', (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ──────────────────────────────────
app.use(errorHandler);

// ── Socket.io ────────────────────────────────────────────
initSocket(io);
app.set('io', io);

// ── Database Connections + Server Start ───────────────────
async function startServer() {
  try {
    // All connections gracefully fall back to mock/in-memory if unavailable
    await connectRedis();
    await connectPostgres();
    await connectMongo();

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      logger.info(`🚀 LoveMarriage API running on http://localhost:${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📱 Ready for iOS app connections`);
    });
  } catch (err) {
    logger.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection:', err);
});

startServer();

module.exports = { app, io };
