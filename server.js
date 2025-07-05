const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

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

// Auth routes with rate limiting
app.use('/api/auth', authLimiter);

// Sample auth endpoint (to be expanded)
app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  
  // Basic validation
  if (!email || !password) {
    return sendResponse(res, false, null, 'Email and password are required', 400);
  }
  
  // TODO: Implement actual registration logic
  sendResponse(res, true, {
    user: {
      id: 1,
      email: email,
      created_at: new Date().toISOString()
    },
    token: 'sample_jwt_token_here'
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return sendResponse(res, false, null, 'Email and password are required', 400);
  }
  
  // TODO: Implement actual login logic
  sendResponse(res, true, {
    user: {
      id: 1,
      email: email
    },
    token: 'sample_jwt_token_here'
  });
});

// Sample skills endpoint
app.get('/api/skills/categories', (req, res) => {
  // TODO: Implement actual database query
  sendResponse(res, true, {
    categories: [
      {
        name: 'Programming',
        count: 15,
        skills: [
          {
            id: 1,
            name: 'JavaScript Fundamentals',
            difficulty_levels: 5
          },
          {
            id: 2,
            name: 'Python Basics',
            difficulty_levels: 4
          }
        ]
      },
      {
        name: 'Design',
        count: 8,
        skills: [
          {
            id: 3,
            name: 'UI/UX Principles',
            difficulty_levels: 3
          }
        ]
      }
    ]
  });
});

// Catch-all for frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  sendResponse(res, false, null, 'Internal server error', 500);
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  sendResponse(res, false, null, 'API endpoint not found', 404);
});

app.listen(PORT, () => {
  console.log(`SkillForge server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});