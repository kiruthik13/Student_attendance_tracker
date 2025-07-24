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
    let { student, date, status, remarks, session, period } = req.body;
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
    if (!period || ![1,2,3,4,5,6,7].includes(Number(period))) {
      return res.status(400).json({ message: 'Valid period (1-7) is required', received: req.body });
    }
    const allowedPeriods = Attendance.getSessionPeriods(session);
    if (!allowedPeriods.includes(Number(period))) {
      return res.status(400).json({ message: 'Period does not match session', received: req.body });
    }
    let attendanceDate = new Date(date);
    attendanceDate.setHours(0,0,0,0);
    const startOfDay = new Date(attendanceDate);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23,59,59,999);
    const studentExists = await Student.findById(student);
    if (!studentExists) {
      return res.status(404).json({ message: 'Student not found' });
    }
    // Check if attendance already exists for this student on this date, session, and period
    const existingAttendance = await Attendance.findOne({
      student,
      session,
      period,
      date: { $gte: startOfDay, $lte: endOfDay }
    });
    if (existingAttendance) {
      existingAttendance.status = status;
      existingAttendance.remarks = remarks;
      existingAttendance.markedBy = req.admin._id;
      existingAttendance.updatedAt = new Date();
      await existingAttendance.save();
      return res.status(200).json({ message: 'Attendance updated successfully', attendance: existingAttendance });
    }
    const attendance = new Attendance({
      student,
      date: attendanceDate,
      session,
      period,
      status,
      remarks,
      markedBy: req.admin._id
    });
    await attendance.save();
    res.status(201).json({ message: 'Attendance marked successfully', attendance });
  } catch (error) {
    console.error('Mark attendance error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Attendance already marked for this student on this date, session, and period', received: req.body });
    }
    res.status(500).json({ message: 'Failed to mark attendance', error: error.message, received: req.body });
  }
});

// POST /api/attendance/bulk-mark - Mark attendance for multiple students
router.post('/bulk-mark', authenticateToken, requireActiveAdmin, validateBulkAttendance, async (req, res) => {
  try {
    let { date, session, attendanceData } = req.body;
    if (!date) {
      return res.status(400).json({ message: 'Date is required', received: req.body });
    }
    if (!session || !['forenoon', 'afternoon'].includes(session)) {
      return res.status(400).json({ message: 'Session (forenoon/afternoon) is required', received: req.body });
    }
    if (!attendanceData || !Array.isArray(attendanceData) || attendanceData.length === 0) {
      return res.status(400).json({ message: 'attendanceData array is required', received: req.body });
    }
    // Validate each record's period
    for (const record of attendanceData) {
      if (!record.period || ![1,2,3,4,5,6,7].includes(Number(record.period))) {
        return res.status(400).json({ message: 'Valid period (1-7) is required in each record', record });
      }
      const allowedPeriods = Attendance.getSessionPeriods(session);
      if (!allowedPeriods.includes(Number(record.period))) {
        return res.status(400).json({ message: 'Period does not match session in record', record });
      }
    }
    let attendanceDate = new Date(date);
    attendanceDate.setHours(0,0,0,0);
    const startOfDay = new Date(attendanceDate);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23,59,59,999);
    const results = [];
    for (const record of attendanceData) {
      try {
        const studentExists = await Student.findById(record.student);
        if (!studentExists) {
          results.push({ student: record.student, success: false, message: 'Student not found' });
          continue;
        }
        const existingAttendance = await Attendance.findOne({
          student: record.student,
          session,
          period: record.period,
          date: { $gte: startOfDay, $lte: endOfDay }
        });
        if (existingAttendance) {
          existingAttendance.status = record.status;
          existingAttendance.remarks = record.remarks;
          existingAttendance.markedBy = req.admin._id;
          existingAttendance.updatedAt = new Date();
          await existingAttendance.save();
          results.push({ student: record.student, period: record.period, success: true, message: 'Attendance updated successfully' });
          continue;
        }
        const attendance = new Attendance({
          student: record.student,
          date: attendanceDate,
          session,
          period: record.period,
          status: record.status,
          remarks: record.remarks,
          markedBy: req.admin._id
        });
        await attendance.save();
        results.push({ student: record.student, period: record.period, success: true, message: 'Attendance marked successfully' });
      } catch (error) {
        console.error(`[BULK MARK] Error for student ${record.student}:`, error.message);
        results.push({ student: record.student, period: record.period, success: false, message: error.message });
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
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setDate(attendanceDate.getDate() + 1);

    // Get all students in class/section
    const students = await Student.find({ className, section, isActive: true }).select('fullName rollNumber className section');
    const studentIds = students.map(s => s._id);

    // Get all attendance records for these students on the given date
    let attendanceRecords = await Attendance.find({
      student: { $in: studentIds },
      date: { $gte: attendanceDate, $lt: nextDay }
    });

    // Filter by session if provided
    if (session && ['forenoon', 'afternoon'].includes(session)) {
      attendanceRecords = attendanceRecords.filter(a => a.session === session);
    }
    // Filter by studentId if provided
    if (studentId) {
      attendanceRecords = attendanceRecords.filter(a => a.student && a.student.toString() === studentId);
    }

    // Build period-wise report for each student
    const periods = [1,2,3,4,5,6,7];
    const report = students.map(student => {
      const periodStatus = {};
      periods.forEach(period => {
        const rec = attendanceRecords.find(a => a.student.toString() === student._id.toString() && a.period === period);
        periodStatus[`period${period}`] = rec ? rec.status : 'not-marked';
      });
      return {
        studentId: student._id,
        fullName: student.fullName,
        rollNumber: student.rollNumber,
        className: student.className,
        section: student.section,
        ...periodStatus
      };
    });

    res.json({
      attendance: report,
      date: attendanceDate,
      className,
      section,
      periods
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
    const { status, remarks, session, period } = req.body;
    if (!session || !['forenoon', 'afternoon'].includes(session)) {
      return res.status(400).json({ message: 'Session (forenoon/afternoon) is required' });
    }
    if (!period || ![1,2,3,4,5,6,7].includes(Number(period))) {
      return res.status(400).json({ message: 'Valid period (1-7) is required', received: req.body });
    }
    const allowedPeriods = Attendance.getSessionPeriods(session);
    if (!allowedPeriods.includes(Number(period))) {
      return res.status(400).json({ message: 'Period does not match session', received: req.body });
    }
    const attendanceId = req.params.id;
    // Find attendance by ID
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    // Update fields
    attendance.session = session;
    attendance.period = period; // Update period
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
    const { status, remarks, session, period } = req.body;
    if (!session || !['forenoon', 'afternoon'].includes(session)) {
      return res.status(400).json({ message: 'Session (forenoon/afternoon) is required' });
    }
    if (!period || ![1,2,3,4,5,6,7].includes(Number(period))) {
      return res.status(400).json({ message: 'Valid period (1-7) is required', received: req.body });
    }
    const allowedPeriods = Attendance.getSessionPeriods(session);
    if (!allowedPeriods.includes(Number(period))) {
      return res.status(400).json({ message: 'Period does not match session', received: req.body });
    }

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { status, remarks, session, period },
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

// GET /api/attendance/daily-report - Get daily attendance report for all students (optionally filtered by class/section)
router.get('/daily-report', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const { date, className, section } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setDate(attendanceDate.getDate() + 1);

    // Build student query
    const studentQuery = { isActive: true };
    if (className) studentQuery.className = className;
    if (section) studentQuery.section = section;
    const students = await Student.find(studentQuery).select('fullName rollNumber className section');
    const studentIds = students.map(s => s._id);

    // Get all attendance records for these students on the given date
    const attendanceRecords = await Attendance.find({
      student: { $in: studentIds },
      date: { $gte: attendanceDate, $lt: nextDay }
    });

    // Group attendance by student and session
    const report = students.map(student => {
      const forenoon = attendanceRecords.find(a => a.student.toString() === student._id.toString() && a.session === 'forenoon');
      const afternoon = attendanceRecords.find(a => a.student.toString() === student._id.toString() && a.session === 'afternoon');
      return {
        studentId: student._id,
        fullName: student.fullName,
        rollNumber: student.rollNumber,
        className: student.className,
        section: student.section,
        forenoon: forenoon ? forenoon.status : 'not-marked',
        afternoon: afternoon ? afternoon.status : 'not-marked'
      };
    });
    res.json({ date: attendanceDate, report });
  } catch (error) {
    console.error('Get daily attendance report error:', error);
    res.status(500).json({ message: 'Failed to fetch daily attendance report' });
  }
});

// GET /api/attendance/range-report - Get attendance report for a class/section over a date range
router.get('/range-report', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const { startDate, endDate, className, section } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Build student query
    const studentQuery = { isActive: true };
    if (className) studentQuery.className = className;
    if (section) studentQuery.section = section;
    const students = await Student.find(studentQuery).select('fullName rollNumber className section');
    const studentIds = students.map(s => s._id);

    // Get all attendance records for these students in the date range
    const attendanceRecords = await Attendance.find({
      student: { $in: studentIds },
      date: { $gte: start, $lte: end }
    });

    // Get all dates in the range
    const dateList = [];
    let current = new Date(start);
    while (current <= end) {
      dateList.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const periods = [1,2,3,4,5,6,7];
    // Group attendance by student and date, per period
    const report = students.map(student => {
      const studentReport = dateList.map(dateObj => {
        const dateStr = dateObj.toISOString().split('T')[0];
        const periodStatus = {};
        periods.forEach(period => {
          const rec = attendanceRecords.find(a => a.student.toString() === student._id.toString() && a.period === period && a.date.toISOString().split('T')[0] === dateStr);
          periodStatus[`period${period}`] = rec ? rec.status : 'not-marked';
        });
        return {
          date: dateStr,
          ...periodStatus
        };
      });
      return {
        studentId: student._id,
        fullName: student.fullName,
        rollNumber: student.rollNumber,
        className: student.className,
        section: student.section,
        attendance: studentReport
      };
    });
    res.json({ startDate, endDate, report, dates: dateList.map(d => d.toISOString().split('T')[0]), periods });
  } catch (error) {
    console.error('Get range attendance report error:', error);
    res.status(500).json({ message: 'Failed to fetch range attendance report' });
  }
});

module.exports = router; 