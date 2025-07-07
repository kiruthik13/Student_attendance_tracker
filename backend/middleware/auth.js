const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const config = require('../config/config');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Find admin by id from token
    const admin = await Admin.findById(decoded.adminId).select('-password');
    
    if (!admin) {
      return res.status(401).json({ 
        message: 'Invalid token. Admin not found.' 
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({ 
        message: 'Account is deactivated. Please contact administrator.' 
      });
    }

    // Add admin to request object
    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired. Please login again.' 
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      message: 'Authentication error.' 
    });
  }
};

// Middleware to check if admin is super admin
const requireSuperAdmin = (req, res, next) => {
  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({ 
      message: 'Access denied. Super admin privileges required.' 
    });
  }
  next();
};

// Middleware to check if admin is active
const requireActiveAdmin = (req, res, next) => {
  if (!req.admin.isActive) {
    return res.status(403).json({ 
      message: 'Account is deactivated. Please contact administrator.' 
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireSuperAdmin,
  requireActiveAdmin
}; 