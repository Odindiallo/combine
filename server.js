const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const database = require('./db/database');
const authRoutes = require('./api/auth');
const skillsRoutes = require('./api/skills');
const assessmentRoutes = require('./api/assessment');
const progressRoutes = require('./api/progress');
const achievementRoutes = require('./api/achievements');
const sseRoutes = require('./api/sse');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour per IP
  message: {
    success: false,
    error: 'Rate limit exceeded. Please try again later.',
    data: null,
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  }
});

// Auth rate limiting
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 auth requests per minute per IP
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
    data: null,
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Standard response helper
const sendResponse = (res, success, data = null, error = null, statusCode = 200) => {
  res.status(statusCode).json({
    success,
    data,
    error,
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
};

// Health check endpoint
app.get('/health', (req, res) => {
  sendResponse(res, true, { status: 'OK', message: 'SkillForge API is running' });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/sse', sseRoutes);

// 404 handler for API routes - must be after all API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    sendResponse(res, false, null, 'API endpoint not found', 404);
  } else {
    next();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  sendResponse(res, false, null, 'Internal server error', 500);
});

// Catch-all for frontend routing (must be last)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and start server
database.connect().then(() => {
  app.listen(PORT, () => {
    console.log(`SkillForge server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('Database connected and initialized');
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});