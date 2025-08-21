// src/app.js
require('dotenv').config();               // << must stay first
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { ping } = require('./config/database');  // << require after .env
const apiRoutes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const logger = require('./utils/logger');
const { redisClient } = require('./controllers/authController'); // import redisClient

const app = express();

// Trust proxy for Nginx reverse proxy
app.set('trust proxy', true);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting (skip in tests to avoid flakiness)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
if (process.env.NODE_ENV !== 'test') {
  app.use(limiter);
}

// General middleware
app.use(compression());

// quiet the request log in tests (optional)
const morganOptions = (process.env.NODE_ENV === 'test')
  ? { skip: () => true }
  : { stream: { write: msg => logger.info(msg.trim()) } };

app.use(morgan('combined', morganOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', async (req, res) => {
  const dbOk = await ping();
  let redisOk = false;
  try {
    await redisClient.ping();
    redisOk = true;
  } catch (err) {
    redisOk = false;
  }
  res.status(200).json({
    status: 'OK',
    db: dbOk ? 'up' : 'down',
    redis: redisOk ? 'up' : 'down',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/v1', apiRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// IMPORTANT: do NOT call app.listen() here.
// Export the bare app for tests (supertest) and for the server entry.
module.exports = app;
