const express = require('express');
const Student = require('../models/Student');
const { authenticateToken, requireActiveAdmin } = require('../middleware/auth');
const {
  validateStudentCreation,
  validateStudentUpdate
} = require('../middleware/validation');

const router = express.Router();

// Add logging middleware for debugging
router.use((req, res, next) => {
  console.log(`[StudentRoutes] ${req.method} ${req.originalUrl} - Auth header:`, req.headers.authorization);
  next();
});

// GET /api/students - Get all students with pagination and filters
router.get('/', authenticateToken, requireActiveAdmin, async (req, res) => {
  console.log('[StudentRoutes] GET / - Accessed');
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      className = '', 
      section = '',
      isActive = ''
    } = req.query;

    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Class filter
    if (className) {
      query.className = className;
    }

    // Section filter
    if (section) {
      query.section = section;
    }

    // Active status filter
    if (isActive !== '') {
      query.isActive = isActive === 'true';
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const students = await Student.find(query)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    const total = await Student.countDocuments(query);

    res.json({
      students,
      totalPages: Math.ceil(total / options.limit),
      currentPage: options.page,
      totalStudents: total
    });

  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      message: 'Failed to fetch students'
    });
  }
});

// GET /api/students/:id - Get student by ID
router.get('/:id', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({
        message: 'Student not found'
      });
    }

    res.json({ student });

  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({
      message: 'Failed to fetch student'
    });
  }
});

// POST /api/students - Create new student
router.post('/', authenticateToken, requireActiveAdmin, validateStudentCreation, async (req, res) => {
  try {
    const {
      fullName,
      email,
      rollNumber,
      className,
      section,
      phoneNumber,
      parentName,
      parentPhone,
      address
    } = req.body;

    // Check if email already exists
    const existingEmail = await Student.emailExists(email);
    if (existingEmail) {
      return res.status(400).json({
        message: 'Student with this email already exists'
      });
    }

    // Check if roll number already exists
    const existingRollNumber = await Student.rollNumberExists(rollNumber);
    if (existingRollNumber) {
      return res.status(400).json({
        message: 'Student with this roll number already exists'
      });
    }

    // Create new student
    const student = new Student({
      fullName,
      email,
      rollNumber,
      className,
      section,
      phoneNumber,
      parentName,
      parentPhone,
      address
    });

    await student.save();

    res.status(201).json({
      message: 'Student created successfully',
      student: student.getPublicProfile()
    });

  } catch (error) {
    console.error('Create student error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `Student with this ${field} already exists`
      });
    }

    res.status(500).json({
      message: 'Failed to create student'
    });
  }
});

// PUT /api/students/:id - Update student
router.put('/:id', authenticateToken, requireActiveAdmin, validateStudentUpdate, async (req, res) => {
  try {
    const {
      fullName,
      email,
      className,
      section,
      phoneNumber,
      parentName,
      parentPhone,
      address,
      isActive
    } = req.body;

    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (className) updateData.className = className;
    if (section) updateData.section = section;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (parentName) updateData.parentName = parentName;
    if (parentPhone) updateData.parentPhone = parentPhone;
    if (address) updateData.address = address;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    // Check for email uniqueness if email is being updated
    if (email) {
      const existingEmail = await Student.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: req.params.id } 
      });
      
      if (existingEmail) {
        return res.status(400).json({
          message: 'Student with this email already exists'
        });
      }
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({
        message: 'Student not found'
      });
    }

    res.json({
      message: 'Student updated successfully',
      student: updatedStudent.getPublicProfile()
    });

  } catch (error) {
    console.error('Update student error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `Student with this ${field} already exists`
      });
    }

    res.status(500).json({
      message: 'Failed to update student'
    });
  }
});

// DELETE /api/students/:id - Delete student
router.delete('/:id', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    
    if (!student) {
      return res.status(404).json({
        message: 'Student not found'
      });
    }

    res.json({
      message: 'Student deleted successfully'
    });

  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      message: 'Failed to delete student'
    });
  }
});

// GET /api/students/classes/list - Get list of all classes
router.get('/classes/list', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const classes = await Student.distinct('className');
    res.json({ classes });

  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({
      message: 'Failed to fetch classes'
    });
  }
});

// GET /api/students/sections/list - Get list of all sections
router.get('/sections/list', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const sections = await Student.distinct('section');
    res.json({ sections });

  } catch (error) {
    console.error('Get sections error:', error);
    res.status(500).json({
      message: 'Failed to fetch sections'
    });
  }
});

module.exports = router; 