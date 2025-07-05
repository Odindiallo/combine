const express = require('express');
const rateLimit = require('express-rate-limit');
const authService = require('../services/auth-service');
const database = require('../db/database');

const router = express.Router();

// Helper function to send standardized responses
const sendResponse = (res, success, data = null, error = null, statusCode = 200, errorCode = null) => {
  const response = {
    success,
    data,
    error,
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  };
  
  if (errorCode) {
    response.metadata.errorCode = errorCode;
  }
  
  res.status(statusCode).json(response);
};

// Specific rate limiter for assessment endpoints
const assessmentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 assessment requests per minute per user
  message: {
    success: false,
    error: 'Too many assessment requests. Please try again later.',
    data: null,
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      errorCode: 1005
    }
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return sendResponse(res, false, null, 'Email and password are required', 400, 1007);
    }
    
    const result = await authService.registerUser(email, password);
    sendResponse(res, true, result);
  } catch (error) {
    let errorCode = 1000;
    let statusCode = 500;
    
    switch (error.message) {
      case 'Email and password are required':
        errorCode = 1007;
        statusCode = 400;
        break;
      case 'Invalid email format':
        errorCode = 1006;
        statusCode = 400;
        break;
      case 'Password must be at least 8 characters long':
        errorCode = 1006;
        statusCode = 400;
        break;
      case 'Email already exists':
        errorCode = 1009;
        statusCode = 409;
        break;
      case 'UNIQUE constraint failed: users.email':
        errorCode = 1019;
        statusCode = 409;
        break;
      default:
        errorCode = 1000;
        statusCode = 500;
    }
    
    sendResponse(res, false, null, error.message, statusCode, errorCode);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return sendResponse(res, false, null, 'Email and password are required', 400, 1007);
    }
    
    const result = await authService.loginUser(email, password);
    sendResponse(res, true, result);
  } catch (error) {
    let errorCode = 1000;
    let statusCode = 500;
    
    switch (error.message) {
      case 'Email and password are required':
        errorCode = 1007;
        statusCode = 400;
        break;
      case 'Invalid credentials':
        errorCode = 1010;
        statusCode = 401;
        break;
      case 'User not found':
        errorCode = 1008;
        statusCode = 404;
        break;
      default:
        errorCode = 1000;
        statusCode = 500;
    }
    
    sendResponse(res, false, null, error.message, statusCode, errorCode);
  }
});

// GET /api/auth/verify
router.get('/verify', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    const result = await authService.verifyUserToken(token);
    sendResponse(res, true, result);
  } catch (error) {
    let errorCode = 1002;
    let statusCode = 401;
    
    switch (error.message) {
      case 'Token expired':
      case 'Invalid token':
        errorCode = 1002;
        statusCode = 401;
        break;
      case 'User not found':
        errorCode = 1008;
        statusCode = 404;
        break;
      case 'Authentication required':
        errorCode = 1003;
        statusCode = 401;
        break;
      default:
        errorCode = 1002;
        statusCode = 401;
    }
    
    sendResponse(res, false, null, error.message, statusCode, errorCode);
  }
});

// GET /api/auth/logout
router.get('/logout', authService.authenticateToken.bind(authService), (req, res) => {
  try {
    // With JWT, logout is handled client-side by removing the token
    // Here we just confirm the logout action
    sendResponse(res, true, {
      message: 'Logged out successfully'
    });
  } catch (error) {
    sendResponse(res, false, null, 'Logout failed', 500, 1000);
  }
});

module.exports = router;