const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const config = require('../config/config');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    // Check if user exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ message: 'Invalid token.' });
    if (error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expired.' });
    return res.status(500).json({ message: 'Authentication error.' });
  }
};

// Middleware to authenticate Admin JWT token
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    // Case 1: Token from Admin Login (has adminId)
    if (decoded.adminId) {
      const admin = await Admin.findById(decoded.adminId).select('-password');
      if (!admin) {
        console.log('Admin Auth Failed: Admin not found for ID', decoded.adminId);
        return res.status(401).json({ message: 'Invalid token. Admin not found.' });
      }
      req.admin = admin;
      return next();
    }

    // Case 2: Token from User Login (has id and role='admin')
    if (decoded.role === 'admin' && decoded.id) {
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        console.log('Admin Auth Failed: User not found for ID', decoded.id);
        return res.status(401).json({ message: 'Invalid token. User not found.' });
      }
      // Map user to req.admin to satisfy downstream controllers/middleware
      req.admin = user;
      return next();
    }

    console.log('Admin Auth Failed: Token missing valid admin credentials', decoded);
    return res.status(403).json({ message: 'Invalid token type. Admin access required.' });

  } catch (error) {
    console.error('Admin Auth Error:', error.message);
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ message: 'Invalid token.' });
    if (error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expired.' });
    return res.status(500).json({ message: 'Authentication error.' });
  }
};

// Middleware to check if admin is active
const requireActiveAdmin = (req, res, next) => {
  if (!req.admin || !req.admin.isActive) {
    return res.status(403).json({ message: 'Account is deactivated. Please contact administrator.' });
  }
  next();
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authenticateAdmin,
  requireActiveAdmin,
  restrictTo
}; 