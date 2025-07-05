const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const database = require('../db/database');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
    this.jwtExpiration = process.env.JWT_EXPIRATION || '24h';
    this.saltRounds = 12;
  }

  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      throw new Error('Password hashing failed');
    }
  }

  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error('Password verification failed');
    }
  }

  generateToken(payload) {
    try {
      return jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiration,
        issuer: 'skillforge-api',
        audience: 'skillforge-client'
      });
    } catch (error) {
      throw new Error('Token generation failed');
    }
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'skillforge-api',
        audience: 'skillforge-client'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  async registerUser(email, password) {
    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (!this.isValidPassword(password)) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Check if user already exists
    const existingUser = await database.getUserByEmail(email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    try {
      // Hash password and create user
      const passwordHash = await this.hashPassword(password);
      const result = await database.createUser(email, passwordHash);
      
      // Return user data (excluding password)
      const user = {
        id: result.lastID,
        email: email,
        created_at: new Date().toISOString()
      };

      // Generate JWT token
      const token = this.generateToken({
        userId: user.id,
        email: user.email
      });

      return { user, token };
    } catch (error) {
      if (error.message === 'Email already exists') {
        throw error;
      }
      throw new Error('User registration failed');
    }
  }

  async loginUser(email, password) {
    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    try {
      // Get user from database
      const user = await database.getUserByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Generate token
      const token = this.generateToken({
        userId: user.id,
        email: user.email
      });

      // Return user data (excluding password)
      const userData = {
        id: user.id,
        email: user.email
      };

      return { user: userData, token };
    } catch (error) {
      if (error.message === 'Invalid credentials') {
        throw error;
      }
      throw new Error('Login failed');
    }
  }

  async verifyUserToken(token) {
    try {
      const decoded = this.verifyToken(token);
      
      // Get fresh user data from database
      const user = await database.getUserById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        user: {
          id: user.id,
          email: user.email
        },
        valid: true
      };
    } catch (error) {
      throw error;
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPassword(password) {
    return password && password.length >= 8;
  }

  // Middleware for protecting routes
  authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        data: null,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          errorCode: 1003
        }
      });
    }

    try {
      const decoded = this.verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: error.message,
        data: null,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          errorCode: 1002
        }
      });
    }
  }

  // Optional middleware for routes that can work with or without auth
  optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = this.verifyToken(token);
        req.user = decoded;
      } catch (error) {
        // Token invalid but continue anyway
        req.user = null;
      }
    } else {
      req.user = null;
    }
    
    next();
  }

  // Alias for authenticateToken to match usage in route files
  verifyToken(req, res, next) {
    return this.authenticateToken(req, res, next);
  }
}

// Export singleton instance
const authService = new AuthService();
module.exports = authService;