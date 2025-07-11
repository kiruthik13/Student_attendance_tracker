const express = require('express');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { authenticateToken, requireActiveAdmin } = require('../middleware/auth');
const {
  validateAttendanceMarking,
  validateBulkAttendance
} = require('../middleware/validation');

const router = express.Router();

// POST /api/attendance/mark - Mark attendance for a single student
router.post('/mark', authenticateToken, requireActiveAdmin, validateAttendanceMarking, async (req, res) => {
  try {
    let { student, date, status, remarks, session } = req.body;
    console.log('[ATTENDANCE MARK] Request body:', req.body);
    if (!student) {
      return res.status(400).json({ message: 'Student is required', received: req.body });
    }
    if (!date) {
      return res.status(400).json({ message: 'Date is required', received: req.body });
    }
    if (!status) {
      return res.status(400).json({ message: 'Status is required', received: req.body });
    }
    if (!session || !['forenoon', 'afternoon'].includes(session)) {
      return res.status(400).json({ message: 'Session (forenoon/afternoon) is required', received: req.body });
    }
    // Ensure date is a Date object and use only the date part
    let attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0,0,0,0);
    const startOfDay = new Date(attendanceDate);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23,59,59,999);
    console.log('[ATTENDANCE MARK] Using date range:', startOfDay, endOfDay, 'Session:', session);
    // Check if student exists
    const studentExists = await Student.findById(student);
    if (!studentExists) {
      return res.status(404).json({ message: 'Student not found' });
    }
    // Check if attendance already exists for this student on this date and session
    const existingAttendance = await Attendance.findOne({
      student,
      session,
      date: { $gte: startOfDay, $lte: endOfDay }
    });
    if (existingAttendance) {
      // Update the existing record
      existingAttendance.status = status;
      existingAttendance.remarks = remarks;
      existingAttendance.markedBy = req.admin._id;
      existingAttendance.updatedAt = new Date();
      await existingAttendance.save();
      return res.status(200).json({ message: 'Attendance updated successfully', attendance: existingAttendance });
    }
    // Create attendance record if not exists
    const attendance = new Attendance({
      student,
      date: attendanceDate,
      session,
      status,
      remarks,
      markedBy: req.admin._id
    });
    await attendance.save();
    res.status(201).json({ message: 'Attendance marked successfully', attendance });
  } catch (error) {
    console.error('Mark attendance error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Attendance already marked for this student on this date and session', received: req.body });
    }
    res.status(500).json({ message: 'Failed to mark attendance', error: error.message, received: req.body });
  }
});

// POST /api/attendance/bulk-mark - Mark attendance for multiple students
router.post('/bulk-mark', authenticateToken, requireActiveAdmin, validateBulkAttendance, async (req, res) => {
  try {
    let { date, session, attendanceData } = req.body;
    console.log('[BULK MARK] Request body:', req.body);
    if (!date) {
      return res.status(400).json({ message: 'Date is required', received: req.body });
    }
    if (!session || !['forenoon', 'afternoon'].includes(session)) {
      return res.status(400).json({ message: 'Session (forenoon/afternoon) is required', received: req.body });
    }
    if (!attendanceData || !Array.isArray(attendanceData) || attendanceData.length === 0) {
      return res.status(400).json({ message: 'attendanceData array is required', received: req.body });
    }
    // Ensure date is a Date object and use only the date part
    let attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0,0,0,0);
    const startOfDay = new Date(attendanceDate);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23,59,59,999);
    console.log('[BULK MARK] Using date range:', startOfDay, endOfDay, 'Session:', session);
    const results = [];
    for (const record of attendanceData) {
      try {
        // Check if student exists
        const studentExists = await Student.findById(record.student);
        if (!studentExists) {
          results.push({ student: record.student, success: false, message: 'Student not found' });
          continue;
        }
        // Check if attendance already exists
        const existingAttendance = await Attendance.findOne({
          student: record.student,
          session,
          date: { $gte: startOfDay, $lte: endOfDay }
        });
        if (existingAttendance) {
          // Update the existing record
          existingAttendance.status = record.status;
          existingAttendance.remarks = record.remarks;
          existingAttendance.markedBy = req.admin._id;
          existingAttendance.updatedAt = new Date();
          await existingAttendance.save();
          results.push({ student: record.student, success: true, message: 'Attendance updated successfully' });
          continue;
        }
        // Create attendance record if not exists
        const attendance = new Attendance({
          student: record.student,
          date: attendanceDate,
          session,
          status: record.status,
          remarks: record.remarks,
          markedBy: req.admin._id
        });
        await attendance.save();
        results.push({ student: record.student, success: true, message: 'Attendance marked successfully' });
      } catch (error) {
        console.error(`[BULK MARK] Error for student ${record.student}:`, error.message);
        results.push({ student: record.student, success: false, message: error.message });
      }
    }
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    res.status(201).json({ message: `Bulk attendance marked. ${successCount} successful, ${failureCount} failed`, results });
  } catch (error) {
    console.error('Bulk mark attendance error:', error);
    res.status(500).json({ message: 'Failed to mark bulk attendance', error: error.message, received: req.body });
  }
});

// GET /api/attendance/student/:studentId - Get attendance for a specific student
router.get('/student/:studentId', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, page = 1, limit = 30 } = req.query;

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        message: 'Student not found'
      });
    }

    const query = { student: studentId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('student', 'fullName rollNumber className section')
      .populate('markedBy', 'fullName')
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Attendance.countDocuments(query);

    res.json({
      attendance,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalRecords: total
    });

  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({
      message: 'Failed to fetch student attendance'
    });
  }
});

// GET /api/attendance/class - Get attendance for a class on a specific date, with optional session and studentId filters
router.get('/class', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const { className, section, date, session, studentId } = req.query;

    if (!className || !section || !date) {
      return res.status(400).json({
        message: 'Class name, section, and date are required'
      });
    }

    const attendanceDate = new Date(date);
    let attendance = await Attendance.getClassAttendance(className, section, attendanceDate);

    // Filter out null students (students not in the specified class/section)
    attendance = attendance.filter(a => a.student !== null);

    // Filter by session if provided
    if (session && ['forenoon', 'afternoon'].includes(session)) {
      attendance = attendance.filter(a => a.session === session);
    }
    // Filter by studentId if provided
    if (studentId) {
      attendance = attendance.filter(a => a.student && a.student._id.toString() === studentId);
    }

    res.json({
      attendance,
      date: attendanceDate,
      className,
      section
    });

  } catch (error) {
    console.error('Get class attendance error:', error);
    res.status(500).json({
      message: 'Failed to fetch class attendance'
    });
  }
});

// PUT /api/attendance/mark/:id - Update attendance for a single student by attendance ID
router.put('/mark/:id', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const { status, remarks, session } = req.body;
    if (!session || !['forenoon', 'afternoon'].includes(session)) {
      return res.status(400).json({ message: 'Session (forenoon/afternoon) is required' });
    }
    const attendanceId = req.params.id;
    // Find attendance by ID
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    // Update fields
    attendance.session = session;
    if (status) attendance.status = status;
    if (remarks !== undefined) attendance.remarks = remarks;
    attendance.markedBy = req.admin._id;
    attendance.updatedAt = new Date();
    await attendance.save();
    res.status(200).json({ message: 'Attendance updated successfully', attendance });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ message: 'Failed to update attendance' });
  }
});

// PUT /api/attendance/:id - Update attendance record
router.put('/:id', authenticateToken, requireActiveAdmin, validateAttendanceMarking, async (req, res) => {
  try {
    const { status, remarks } = req.body;

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { status, remarks },
      { new: true, runValidators: true }
    ).populate('student', 'fullName rollNumber className section');

    if (!attendance) {
      return res.status(404).json({
        message: 'Attendance record not found'
      });
    }

    res.json({
      message: 'Attendance updated successfully',
      attendance
    });

  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      message: 'Failed to update attendance'
    });
  }
});

// DELETE /api/attendance/:id - Delete attendance record
router.delete('/:id', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({
        message: 'Attendance record not found'
      });
    }

    res.json({
      message: 'Attendance record deleted successfully'
    });

  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({
      message: 'Failed to delete attendance record'
    });
  }
});

// GET /api/attendance/stats/student/:studentId - Get attendance statistics for a student
router.get('/stats/student/:studentId', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        message: 'Student not found'
      });
    }

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1); // Start of year
    const end = endDate ? new Date(endDate) : new Date(); // Today

    const stats = await Attendance.getStudentStats(studentId, start, end);

    res.json({
      student: {
        _id: student._id,
        fullName: student.fullName,
        rollNumber: student.rollNumber,
        className: student.className,
        section: student.section
      },
      stats,
      period: {
        startDate: start,
        endDate: end
      }
    });

  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({
      message: 'Failed to fetch student statistics'
    });
  }
});

// GET /api/attendance/today - Get today's attendance for all students
router.get('/today', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const attendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('student', 'fullName rollNumber className section');

    res.json({ attendance });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      message: "Failed to fetch today's attendance"
    });
  }
});

module.exports = router; 