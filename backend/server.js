require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const { createLogger, transports, format } = require('winston');
const { Server } = require('socket.io');

require('./utils/cloudinary'); // configures the Cloudinary SDK as a side effect

const AppError = require('./utils/AppError');
const { scheduleWorkshopReminders } = require('./jobs/workshopReminders');

mongoose.set('strictQuery', false);

const app = express();

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' })
  ]
});

// --- Fail fast if required environment variables are missing, instead of letting
// a missing JWT_SECRET throw synchronously inside every login attempt (confusing
// generic 500, no clear cause in the logs) or a missing Cloudinary credential only
// surface as a cryptic failure on the first upload attempt. ---
const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'MONGODB_URI',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];
const missingEnvVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name] || !process.env[name].trim());
if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variable(s): ${missingEnvVars.join(', ')}. Server cannot start.`);
  process.exit(1);
}

// --- CORS: allow only known frontend origins (comma-separated in FRONTEND_URL) plus localhost dev ---
// Shared by both the Express `cors()` middleware (for /api/*) and the Socket.io
// server below (whose transport isn't covered by the Express middleware) so
// the two allow-lists can never drift apart.
const allowedOrigins = [
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((s) => s.trim()) : []),
  'http://localhost:3000'
];
function corsOriginCheck(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  callback(new Error('Not allowed by CORS'));
}
app.use(cors({ origin: corsOriginCheck }));

app.use(express.json({ limit: '20kb' }));
app.use(helmet());
app.use(mongoSanitize());
// No blanket XSS-stripping middleware: React escapes plain string fields by
// default, and rich-text fields (Update/Notice content) are sanitized with an
// HTML allowlist at the point of saving via utils/sanitizeRichText.js instead
// — xss-clean stripped legitimate formatting tags with no way to exempt fields.

// --- Rate limiting ---
// Limits are per IP. In development every request (every tab, every polling
// endpoint like messages/notifications) comes from the same localhost IP, so
// the production-strength limit was exhausted within minutes of normal use.
// Keep the strict limits in production; open them up well past any real dev
// session's traffic otherwise.
const isProd = process.env.NODE_ENV === 'production';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 300 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many requests, please try again later.' }
});
app.use('/api', generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many attempts, please try again later.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// --- Reject requests while Mongo isn't connected, instead of hanging for 10s and returning a generic 500 ---
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ msg: 'Database not connected, try again shortly' });
  }
  next();
});

// --- Initial MongoDB connection with retry/backoff. Mongoose only registers its
// automatic-reconnection listeners after a successful connect, so if the very
// first attempt fails (wrong URI, network/allowlist issue at boot) it would
// otherwise never retry and the app would be stuck returning 503 forever until
// a manual restart. Once connected (even on a later retry), mongoose's normal
// reconnection handling takes over for any future disconnect. ---
async function connectWithRetry(retries = 5, delayMs = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info('MongoDB connected');
      scheduleWorkshopReminders(logger);
      return;
    } catch (err) {
      logger.error(`MongoDB connection attempt ${i + 1}/${retries} failed: ${err.message}`);
      if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  logger.error(
    'MongoDB connection failed after all retries — the server will keep running and retry lazily via the /api readiness gate, but is currently unable to serve any /api request.'
  );
}

connectWithRetry();

// --- Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/industries', require('./routes/industries'));
app.use('/api/updates', require('./routes/updates'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/polls', require('./routes/polls'));
app.use('/api/workshops', require('./routes/workshops'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/vacancies', require('./routes/vacancies'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/site-content', require('./routes/siteContent'));
app.use('/api/site-settings', require('./routes/siteSettings'));
app.use('/api/translations', require('./routes/translations'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/grievances', require('./routes/grievances'));
app.use('/api/dues', require('./routes/dues'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/push', require('./routes/push'));
app.use('/api/audit-log', require('./routes/auditLog'));
app.use('/api/export', require('./routes/export'));
app.use('/api/search', require('./routes/search'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/nicknames', require('./routes/nicknames'));

// 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ msg: 'Not found' });
});

// --- Centralized error handler ---
app.use((err, req, res, next) => {
  let error = err;

  if (err.name === 'CastError') {
    error = new AppError('Resource not found', 404);
  } else if (err.code === 11000) {
    error = new AppError('Duplicate value for a unique field', 400);
  } else if (err.name === 'ValidationError') {
    error = new AppError(Object.values(err.errors).map((e) => e.message).join(', '), 400);
  } else if (err.name === 'MulterError') {
    error = new AppError(`Upload error: ${err.message}`, 400);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = new AppError('Invalid or expired token', 401);
  } else if (err.message === 'Not allowed by CORS') {
    error = new AppError('Not allowed by CORS', 403);
  }

  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) {
    logger.error(err.stack || err.message);
  }

  res.status(statusCode).json({ msg: error.isOperational ? error.message : 'Something broke!' });
});

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

const io = new Server(server, {
  cors: { origin: corsOriginCheck, credentials: true }
});
app.set('io', io);
require('./sockets')(io, logger);

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection: ' + err.message);
  server.close(() => process.exit(1));
});

module.exports = app;
