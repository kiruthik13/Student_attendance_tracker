const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Admin = require('../models/Admin');
const config = require('../config/config');
const { sendEmail } = require('../config/email');
const { authenticateToken, requireActiveAdmin } = require('../middleware/auth');
const {
  validateAdminRegistration,
  validateAdminLogin,
  validatePasswordUpdate,
  validateProfileUpdate,
  validatePasswordResetRequest,
  validatePasswordReset
} = require('../middleware/validation');

const router = express.Router();

// Store reset tokens (in production, use Redis or database)
const resetTokens = new Map();

// Generate JWT token
const generateToken = (adminId) => {
  return jwt.sign(
    { adminId },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

// Generate reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
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

    // Send welcome email
    try {
      console.log('Attempting to send welcome email to:', email);
      console.log('Email configuration check:', {
        user: process.env.EMAIL_USER ? 'Set' : 'Not set',
        password: process.env.EMAIL_PASSWORD ? 'Set' : 'Not set'
      });
      
      const emailResult = await sendEmail(email, 'welcomeEmail', [fullName, email]);
      
      if (emailResult.success) {
        console.log('Welcome email sent successfully to:', email);
        console.log('Message ID:', emailResult.messageId);
      } else {
        console.log('Failed to send welcome email:', emailResult.error);
        // Don't fail registration if email fails
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      console.error('Email error details:', {
        message: emailError.message,
        stack: emailError.stack
      });
      // Don't fail the registration if email fails
    }

    // Generate token
    const token = generateToken(savedAdmin._id);

    // Return admin data (without password) and token
    res.status(201).json({
      message: 'Admin registered successfully. Welcome email sent to your inbox.',
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

    // Send login notification email immediately (but don't block response)
    (async () => {
      try {
        console.log('🚀 Starting login email process for:', email);
        
        const loginTime = new Date().toLocaleString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short'
        });
        
        // Get IP address from request
        const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
        
        console.log('📧 ===== LOGIN EMAIL PROCESS STARTED =====');
        console.log('📧 Recipient:', email);
        console.log('📧 Admin Name:', admin.fullName);
        console.log('📧 Login Time:', loginTime);
        console.log('📧 IP Address:', ipAddress);
        
        const emailResult = await sendEmail(
          email, 
          'loginEmail', 
          [admin.fullName, email, loginTime, ipAddress]
        );
        
        if (emailResult && emailResult.success) {
          console.log('✅ ===== LOGIN EMAIL SENT SUCCESSFULLY =====');
          console.log('✅ To:', email);
          console.log('✅ Message ID:', emailResult.messageId);
          console.log('✅ Response:', emailResult.response);
        } else {
          console.error('❌ ===== LOGIN EMAIL FAILED =====');
          console.error('❌ To:', email);
          console.error('❌ Error:', emailResult ? emailResult.error : 'Unknown error');
          console.error('❌ Error Code:', emailResult ? emailResult.code : 'N/A');
          console.error('❌ Error Command:', emailResult ? emailResult.command : 'N/A');
        }
      } catch (emailError) {
        console.error('❌ ===== LOGIN EMAIL EXCEPTION =====');
        console.error('❌ To:', email);
        console.error('❌ Exception Message:', emailError.message);
        console.error('❌ Exception Stack:', emailError.stack);
        console.error('❌ Full Exception:', emailError);
      }
    })().catch(err => {
      console.error('❌ ===== UNHANDLED EMAIL ERROR =====');
      console.error('❌ Error:', err);
    });

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

// POST /api/admin/forgot-password - Request password reset
router.post('/forgot-password', validatePasswordResetRequest, async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('Password reset request for email:', email);

    // Find admin by email
    const admin = await Admin.findByEmail(email);
    if (!admin) {
      // Don't reveal if email exists or not for security
      return res.json({
        message: 'If an account with this email exists, a password reset link has been sent.'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(400).json({
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    resetTokens.set(resetToken, {
      adminId: admin._id,
      email: admin.email,
      expiresAt
    });

    // Send password reset email
    try {
      const emailResult = await sendEmail(email, 'passwordResetEmail', [admin.fullName, resetToken]);
      if (emailResult.success) {
        console.log('Password reset email sent successfully to:', email);
      } else {
        console.log('Failed to send password reset email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return res.status(500).json({
        message: 'Failed to send password reset email. Please try again.'
      });
    }

    res.json({
      message: 'If an account with this email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      message: 'Failed to process password reset request. Please try again.'
    });
  }
});

// POST /api/admin/reset-password - Reset password with token
router.post('/reset-password', validatePasswordReset, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    console.log('Password reset attempt with token');

    // Find reset token
    const resetData = resetTokens.get(token);
    if (!resetData) {
      return res.status(400).json({
        message: 'Invalid or expired reset token'
      });
    }

    // Check if token is expired
    if (new Date() > resetData.expiresAt) {
      resetTokens.delete(token);
      return res.status(400).json({
        message: 'Reset token has expired'
      });
    }

    // Find admin
    const admin = await Admin.findById(resetData.adminId);
    if (!admin) {
      resetTokens.delete(token);
      return res.status(400).json({
        message: 'Invalid reset token'
      });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    // Remove used token
    resetTokens.delete(token);

    console.log('Password reset successful for admin:', admin._id);

    res.json({
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      message: 'Failed to reset password. Please try again.'
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

// Test email endpoint
router.post('/test-email', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({
        message: 'Email and name are required'
      });
    }

    console.log('🧪 Testing email functionality...');
    console.log('🧪 Email config:', {
      user: process.env.EMAIL_USER ? 'Set' : 'Not set',
      password: process.env.EMAIL_PASSWORD ? 'Set' : 'Not set'
    });

    const emailResult = await sendEmail(email, 'welcomeEmail', [name, email]);
    
    if (emailResult.success) {
      res.json({
        message: 'Test email sent successfully!',
        messageId: emailResult.messageId,
        response: emailResult.response
      });
    } else {
      res.status(500).json({
        message: 'Failed to send test email',
        error: emailResult.error,
        code: emailResult.code,
        command: emailResult.command
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      message: 'Test email failed',
      error: error.message
    });
  }
});

// Test login email endpoint
router.post('/test-login-email', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({
        message: 'Email and name are required'
      });
    }

    console.log('🧪 Testing login email functionality...');
    
    const loginTime = new Date().toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
    
    const ipAddress = '127.0.0.1'; // Test IP
    
    const emailResult = await sendEmail(email, 'loginEmail', [name, email, loginTime, ipAddress]);
    
    if (emailResult.success) {
      res.json({
        message: 'Test login email sent successfully!',
        messageId: emailResult.messageId,
        response: emailResult.response
      });
    } else {
      res.status(500).json({
        message: 'Failed to send test login email',
        error: emailResult.error,
        code: emailResult.code,
        command: emailResult.command
      });
    }
  } catch (error) {
    console.error('Test login email error:', error);
    res.status(500).json({
      message: 'Test login email failed',
      error: error.message
    });
  }
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