const { body, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }
  next();
};

// Validation rules for admin registration
const validateAdminRegistration = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  handleValidationErrors
];

// Validation rules for admin login
const validateAdminLogin = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Validation rules for password update
const validatePasswordUpdate = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  
  handleValidationErrors
];

// Validation rules for profile update
const validateProfileUpdate = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  
  handleValidationErrors
];

// Validation rules for student creation
const validateStudentCreation = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  
  body('rollNumber')
    .trim()
    .notEmpty()
    .withMessage('Roll number is required'),
  
  body('className')
    .trim()
    .notEmpty()
    .withMessage('Class is required'),
  
  body('section')
    .trim()
    .isLength({ min: 1, max: 2 })
    .withMessage('Section must be 1-2 characters'),
  
  body('phoneNumber')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  
  body('parentPhone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Parent phone number must be 10 digits'),
  
  body('address')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),
  
  handleValidationErrors
];

// Validation rules for student update
const validateStudentUpdate = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  
  body('className')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Class is required'),
  
  body('section')
    .optional()
    .trim()
    .isLength({ min: 1, max: 2 })
    .withMessage('Section must be 1-2 characters'),
  
  body('phoneNumber')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  
  body('parentPhone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Parent phone number must be 10 digits'),
  
  body('address')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),
  
  handleValidationErrors
];

// Validation rules for attendance marking
const validateAttendanceMarking = [
  body('student')
    .isMongoId()
    .withMessage('Valid student ID is required'),
  
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Valid date is required'),
  
  body('status')
    .isIn(['present', 'absent', 'late', 'half-day'])
    .withMessage('Status must be present, absent, late, or half-day'),
  
  body('remarks')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Remarks cannot exceed 200 characters'),
  
  handleValidationErrors
];

// Validation rules for bulk attendance marking
const validateBulkAttendance = [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Valid date is required'),
  
  body('attendanceData')
    .isArray({ min: 1 })
    .withMessage('At least one attendance record is required'),
  
  body('attendanceData.*.student')
    .isMongoId()
    .withMessage('Valid student ID is required'),
  
  body('attendanceData.*.status')
    .isIn(['present', 'absent', 'late', 'half-day'])
    .withMessage('Status must be present, absent, late, or half-day'),
  
  body('attendanceData.*.remarks')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Remarks cannot exceed 200 characters'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateAdminRegistration,
  validateAdminLogin,
  validatePasswordUpdate,
  validateProfileUpdate,
  validateStudentCreation,
  validateStudentUpdate,
  validateAttendanceMarking,
  validateBulkAttendance
}; 