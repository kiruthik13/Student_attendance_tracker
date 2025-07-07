const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const config = require('../config/config');
const { authenticateToken, requireActiveAdmin } = require('../middleware/auth');
const {
  validateAdminRegistration,
  validateAdminLogin,
  validatePasswordUpdate,
  validateProfileUpdate
} = require('../middleware/validation');

const router = express.Router();

// Generate JWT token
const generateToken = (adminId) => {
  return jwt.sign(
    { adminId },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

// POST /api/admin/register - Register new admin
router.post('/register', validateAdminRegistration, async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    
    console.log('Registration attempt:', { fullName, email });

    // Check if admin already exists
    const existingAdmin = await Admin.emailExists(email);
    if (existingAdmin) {
      console.log('Email already exists:', email);
      return res.status(400).json({
        message: 'Admin with this email already exists'
      });
    }

    // Create new admin
    const admin = new Admin({
      fullName,
      email,
      password
    });

    console.log('Saving admin to database...');
    const savedAdmin = await admin.save();
    console.log('Admin saved successfully:', savedAdmin._id);

    // Generate token
    const token = generateToken(savedAdmin._id);

    // Return admin data (without password) and token
    res.status(201).json({
      message: 'Admin registered successfully',
      token,
      admin: savedAdmin.getPublicProfile()
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Admin with this email already exists'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/admin/login - Admin login
router.post('/login', validateAdminLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt for email:', email);

    // Find admin by email
    const admin = await Admin.findByEmail(email);
    if (!admin) {
      console.log('Admin not found for email:', email);
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    console.log('Admin found:', admin._id);

    // Check if admin is active
    if (!admin.isActive) {
      console.log('Admin account is inactive:', admin._id);
      return res.status(401).json({
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      console.log('Invalid password for admin:', admin._id);
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    console.log('Password verified successfully for admin:', admin._id);

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate token
    const token = generateToken(admin._id);

    console.log('Login successful for admin:', admin._id);

    res.json({
      message: 'Login successful',
      token,
      admin: admin.getPublicProfile()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Login failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/profile - Get admin profile (protected route)
router.get('/profile', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    res.json({
      admin: req.admin
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Failed to get profile'
    });
  }
});

// PUT /api/admin/profile - Update admin profile (protected route)
router.put('/profile', authenticateToken, requireActiveAdmin, validateProfileUpdate, async (req, res) => {
  try {
    const { fullName, email } = req.body;
    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (email) {
      // Check if email is already taken by another admin
      const existingAdmin = await Admin.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: req.admin._id } 
      });
      
      if (existingAdmin) {
        return res.status(400).json({
          message: 'Email is already taken by another admin'
        });
      }
      updateData.email = email.toLowerCase();
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.admin._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      admin: updatedAdmin
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Email is already taken by another admin'
      });
    }

    res.status(500).json({
      message: 'Failed to update profile'
    });
  }
});

// PUT /api/admin/change-password - Change password (protected route)
router.put('/change-password', authenticateToken, requireActiveAdmin, validatePasswordUpdate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get admin with password
    const admin = await Admin.findById(req.admin._id);
    
    // Verify current password
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: 'Current password is incorrect'
      });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      message: 'Failed to change password'
    });
  }
});

// POST /api/admin/logout - Logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  // Note: JWT tokens are stateless, so we just return success
  // The client should remove the token from storage
  res.json({
    message: 'Logged out successfully'
  });
});

// GET /api/admin/verify-token - Verify token validity
router.get('/verify-token', authenticateToken, requireActiveAdmin, (req, res) => {
  res.json({
    message: 'Token is valid',
    admin: req.admin
  });
});

// GET /api/admin/test - Test database connection and operations
router.get('/test', async (req, res) => {
  try {
    console.log('Testing database connection...');
    
    // Test database connection
    const dbState = mongoose.connection.readyState;
    console.log('Database connection state:', dbState);
    
    // Test creating a document
    const testAdmin = new Admin({
      fullName: 'Test Admin',
      email: 'test@example.com',
      password: 'testpassword123'
    });
    
    console.log('Attempting to save test admin...');
    const savedTestAdmin = await testAdmin.save();
    console.log('Test admin saved successfully:', savedTestAdmin._id);
    
    // Test finding the document
    const foundAdmin = await Admin.findById(savedTestAdmin._id);
    console.log('Test admin found:', foundAdmin ? 'Yes' : 'No');
    
    // Clean up - delete test document
    await Admin.findByIdAndDelete(savedTestAdmin._id);
    console.log('Test admin deleted successfully');
    
    res.json({
      message: 'Database test successful',
      connectionState: dbState,
      testResults: {
        save: 'Success',
        find: foundAdmin ? 'Success' : 'Failed',
        delete: 'Success'
      }
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      message: 'Database test failed',
      error: error.message,
      connectionState: mongoose.connection.readyState
    });
  }
});

module.exports = router; 