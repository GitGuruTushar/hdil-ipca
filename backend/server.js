require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const { createLogger, transports, format } = require('winston');

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

// --- CORS: allow only known frontend origins (comma-separated in FRONTEND_URL) plus localhost dev ---
const allowedOrigins = [
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((s) => s.trim()) : []),
  'http://localhost:3000'
];
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    }
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());

// --- Rate limiting ---
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many requests, please try again later.' }
});
app.use('/api', generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info('MongoDB connected');
    scheduleWorkshopReminders(logger);
  })
  .catch((err) => logger.error('MongoDB connection error: ' + err.message));

// --- Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/industries', require('./routes/industries'));
app.use('/api/updates', require('./routes/updates'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/polls', require('./routes/polls'));
app.use('/api/workshops', require('./routes/workshops'));

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

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection: ' + err.message);
  server.close(() => process.exit(1));
});

module.exports = app;
