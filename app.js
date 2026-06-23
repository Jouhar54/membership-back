const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Load env
require('dotenv').config();

const app = express();

// Security and middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5174', // Default frontend port
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api', limiter);

// Basic Route for testing
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API is running' });
});

// Routes
const authRoutes = require('./src/routes/auth.routes');
const batchRoutes = require('./src/routes/batch.routes');
const membershipRoutes = require('./src/routes/membership.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/batches', batchRoutes);
app.use('/api/v1/memberships', membershipRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Error Middleware
const { errorHandler } = require('./src/middlewares/error.middleware');
app.use(errorHandler);

module.exports = app;
