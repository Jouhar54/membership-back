import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

// Load env
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// Security and middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173', // Default frontend port
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
import authRoutes from './src/routes/auth.routes.js';
import batchRoutes from './src/routes/batch.routes.js';
import membershipRoutes from './src/routes/membership.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/batches', batchRoutes);
app.use('/api/v1/memberships', membershipRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Error Middleware
import { errorHandler } from './src/middlewares/error.middleware.js';
app.use(errorHandler);

export default app;
