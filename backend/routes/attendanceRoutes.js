const express = require('express');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { authenticateToken, requireActiveAdmin } = require('../middleware/auth');
const {
  validateAttendanceMarking,
  validateBulkAttendance
} = require('../middleware/validation');
const ExcelJS = require('exceljs'); // Add at the top with other requires
const { sendEmail } = require('../config/email');

const router = express.Router();

// Test endpoint without authentication
router.get('/test', (req, res) => {
  res.json({ message: 'Attendance routes are working!' });
});

// Test CSV generation endpoint
router.get('/test-csv', (req, res) => {
  const testHeaders = ['Name', 'Roll Number', 'Class', 'Section', 'Status'];
  const testRows = [
    ['John Doe', '123', '10th', 'A', 'Present'],
    ['Jane Smith', '124', '10th', 'A', 'Absent'],
    ['Bob Johnson', '125', '10th', 'A', 'Present']
  ];
  const csvContent = generateCSVContent(testHeaders, testRows);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="test.csv"');
  res.send(csvContent);
});

// Health check endpoint for attendance routes
router.get('/health', (req, res) => {
  res.json({ 
    message: 'Attendance routes are healthy!',
    timestamp: new Date().toISOString(),
    routes: [
      'GET /api/attendance/test',
      'GET /api/attendance/test-csv',
      'GET /api/attendance/health',
      'GET /api/attendance/debug-attendance',
      'GET /api/attendance/dashboard-stats',
      'POST /api/attendance/mark',
      'POST /api/attendance/bulk-mark',
      'GET /api/attendance/student/:studentId',
      'GET /api/attendance/class',
      'GET /api/attendance/range-report',
      'GET /api/attendance/date-range-report',
      'GET /api/attendance/export-excel',
      'GET /api/attendance/export-date-range-excel',
      'POST /api/attendance/send-csv-report'
    ]
  });
});

// Debug endpoint to check attendance data
router.get('/debug-attendance', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const { className, section, startDate, endDate } = req.query;
    
    if (!className || !section || !startDate || !endDate) {
      return res.status(400).json({ message: 'Class, section, start date, and end date are required' });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get students
    const students = await Student.find({ className, section, isActive: true }).select('fullName rollNumber className section');
    const studentIds = students.map(s => s._id);

    // Get attendance records
    const attendanceRecords = await Attendance.find({
      student: { $in: studentIds },
      date: { $gte: start, $lte: end }
    }).populate('student', 'fullName rollNumber className section');

    // Get sample data
    const sampleRecords = attendanceRecords.slice(0, 3).map(record => ({
      id: record._id,
      student: record.student.fullName,
      date: record.date,
      forenoonPeriods: record.forenoon.periods.length,
      afternoonPeriods: record.afternoon.periods.length,
      forenoonSample: record.forenoon.periods.slice(0, 2),
      afternoonSample: record.afternoon.periods.slice(0, 2)
    }));

    res.json({
      totalStudents: students.length,
      totalAttendanceRecords: attendanceRecords.length,
      dateRange: { start, end },
      sampleRecords,
      studentIds: studentIds.map(id => id.toString())
    });
  } catch (error) {
    console.error('Debug attendance error:', error);
    res.status(500).json({ message: 'Debug failed', error: error.message });
  }
});

// GET /api/attendance/dashboard-stats - Get dashboard statistics for today
router.get('/dashboard-stats', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Get all active students
    const students = await Student.find({ isActive: true }).select('fullName rollNumber className section');
    const totalStudents = students.length;

    // Get today's attendance records
    const attendanceRecords = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('student', 'fullName rollNumber className section');

    // Process attendance data
    let presentStudents = 0;
    let absentStudents = 0;
    let totalPresentPeriods = 0;
    let totalMarkedPeriods = 0;

    // Create a map of student attendance
    const studentAttendanceMap = {};
    attendanceRecords.forEach(record => {
      const studentId = record.student._id.toString();
      if (!studentAttendanceMap[studentId]) {
        studentAttendanceMap[studentId] = {
          forenoonPeriods: 0,
          afternoonPeriods: 0,
          presentPeriods: 0,
          totalPeriods: 0
        };
      }

      // Count forenoon periods
      if (record.forenoon && record.forenoon.periods) {
        record.forenoon.periods.forEach(period => {
          studentAttendanceMap[studentId].forenoonPeriods++;
          studentAttendanceMap[studentId].totalPeriods++;
          if (period.status === 'present') {
            studentAttendanceMap[studentId].presentPeriods++;
          }
        });
      }

      // Count afternoon periods
      if (record.afternoon && record.afternoon.periods) {
        record.afternoon.periods.forEach(period => {
          studentAttendanceMap[studentId].afternoonPeriods++;
          studentAttendanceMap[studentId].totalPeriods++;
          if (period.status === 'present') {
            studentAttendanceMap[studentId].presentPeriods++;
          }
        });
      }
    });

    // Calculate statistics
    Object.values(studentAttendanceMap).forEach(studentData => {
      totalPresentPeriods += studentData.presentPeriods;
      totalMarkedPeriods += studentData.totalPeriods;

      // A student is considered present if they have any present periods
      if (studentData.presentPeriods > 0) {
        presentStudents++;
      } else if (studentData.totalPeriods > 0) {
        absentStudents++;
      }
    });

    // Students with no attendance marked
    const studentsWithNoAttendance = totalStudents - presentStudents - absentStudents;

    // Calculate attendance rate
    const attendanceRate = totalMarkedPeriods > 0 
      ? Math.round((totalPresentPeriods / totalMarkedPeriods) * 100) 
      : 0;

    // Get recent attendance data for chart
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      
      const dayAttendance = await Attendance.find({
        date: { $gte: date, $lt: nextDay }
      });
      
      let dayPresentPeriods = 0;
      let dayTotalPeriods = 0;
      
      dayAttendance.forEach(record => {
        if (record.forenoon && record.forenoon.periods) {
          record.forenoon.periods.forEach(period => {
            dayTotalPeriods++;
            if (period.status === 'present') dayPresentPeriods++;
          });
        }
        if (record.afternoon && record.afternoon.periods) {
          record.afternoon.periods.forEach(period => {
            dayTotalPeriods++;
            if (period.status === 'present') dayPresentPeriods++;
          });
        }
      });
      
      const dayRate = dayTotalPeriods > 0 ? Math.round((dayPresentPeriods / dayTotalPeriods) * 100) : 0;
      
      last7Days.push({
        date: date.toISOString().split('T')[0],
        rate: dayRate,
        presentPeriods: dayPresentPeriods,
        totalPeriods: dayTotalPeriods
      });
    }

    res.json({
      today: {
        totalStudents,
        presentStudents,
        absentStudents,
        studentsWithNoAttendance,
        attendanceRate,
        totalPresentPeriods,
        totalMarkedPeriods
      },
      last7Days,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

// POST /api/attendance/mark - Mark attendance for a single student
router.post('/mark', authenticateToken, requireActiveAdmin, validateAttendanceMarking, async (req, res) => {
  console.log('[BULK MARK] Request received:', {
    body: req.body,
    headers: req.headers
  });
  
  try {
    let { date, session, attendanceData } = req.body;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required', received: req.body });
    }
    if (!session || !['forenoon', 'afternoon', 'all'].includes(session)) {
      return res.status(400).json({ message: 'Session (forenoon/afternoon/all) is required', received: req.body });
    }
    if (!attendanceData || !Array.isArray(attendanceData) || attendanceData.length === 0) {
      return res.status(400).json({ message: 'attendanceData array is required', received: req.body });
    }
    
    // Validate each record's period and status
    for (const record of attendanceData) {
      if (!record.period || ![1,2,3,4,5,6,7].includes(Number(record.period))) {
        return res.status(400).json({ message: 'Valid period (1-7) is required in each record', record });
      }
      if (!record.status || !['present', 'absent', 'late', 'half-day'].includes(record.status)) {
        return res.status(400).json({ message: 'Valid status (present, absent, late, half-day) is required in each record', record });
      }
      if (!record.student) {
        return res.status(400).json({ message: 'Student ID is required in each record', record });
      }
    }
    
    let attendanceDate = new Date(date);
    attendanceDate.setHours(0,0,0,0);
    
    // Log total entries
    console.log(`[BULK MARK] Processing ${attendanceData.length} records for session: ${session}, date: ${attendanceDate}`);
    console.log("attendanceData length:", attendanceData.length);
    console.table(attendanceData);
    
    // Process each record individually to ensure all are saved
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Group attendance data by student
    const studentAttendanceMap = {};
    
    for (const entry of attendanceData) {
      const studentId = entry.student;
      if (!studentAttendanceMap[studentId]) {
        studentAttendanceMap[studentId] = {
          forenoon: [],
          afternoon: []
        };
      }
      
      const period = Number(entry.period);
      const periodData = {
        period: period,
        status: entry.status,
        remarks: entry.remarks || ''
      };
      
      // Determine session based on period
      let recordSession = session;
      if (session === 'all') {
        recordSession = [1, 2, 3, 4].includes(period) ? 'forenoon' : 'afternoon';
      }
      
      if (recordSession === 'forenoon' || period <= 4) {
        studentAttendanceMap[studentId].forenoon.push(periodData);
      } else {
        studentAttendanceMap[studentId].afternoon.push(periodData);
      }
    }
    
    // Process each student's attendance
    for (const [studentId, attendanceData] of Object.entries(studentAttendanceMap)) {
      try {
        console.log(`[BULK MARK] Processing student ${studentId} with ${attendanceData.forenoon.length} forenoon and ${attendanceData.afternoon.length} afternoon periods`);
        
        // Try to find existing attendance record for this student and date
        const existingAttendance = await Attendance.findOne({
          student: studentId,
          date: attendanceDate
        });
        
        if (existingAttendance) {
          // Update existing record
          // Update forenoon periods
          attendanceData.forenoon.forEach(periodData => {
            const existingPeriod = existingAttendance.forenoon.periods.find(p => p.period === periodData.period);
            if (existingPeriod) {
              existingPeriod.status = periodData.status;
              existingPeriod.remarks = periodData.remarks;
            } else {
              existingAttendance.forenoon.periods.push(periodData);
            }
          });
          
          // Update afternoon periods
          attendanceData.afternoon.forEach(periodData => {
            const existingPeriod = existingAttendance.afternoon.periods.find(p => p.period === periodData.period);
            if (existingPeriod) {
              existingPeriod.status = periodData.status;
              existingPeriod.remarks = periodData.remarks;
            } else {
              existingAttendance.afternoon.periods.push(periodData);
            }
          });
          
          existingAttendance.markedBy = req.admin._id;
          existingAttendance.updatedAt = new Date();
          await existingAttendance.save();
          
          console.log(`[BULK MARK] Updated existing record for student ${studentId}`);
          results.push({ 
            success: true, 
            action: 'updated',
            student: studentId,
            forenoonPeriods: attendanceData.forenoon.length,
            afternoonPeriods: attendanceData.afternoon.length
          });
          successCount++;
        } else {
          // Create new record
          const attendance = new Attendance({
            student: studentId,
            date: attendanceDate,
            forenoon: {
              periods: attendanceData.forenoon
            },
            afternoon: {
              periods: attendanceData.afternoon
            },
            markedBy: req.admin._id
          });
          
          await attendance.save();
          
          console.log(`[BULK MARK] Created new record for student ${studentId}`);
          results.push({ 
            success: true, 
            action: 'created',
            student: studentId,
            forenoonPeriods: attendanceData.forenoon.length,
            afternoonPeriods: attendanceData.afternoon.length
          });
          successCount++;
        }
        
      } catch (individualError) {
        console.error(`[BULK MARK] Error processing student ${studentId}:`, individualError);
        results.push({ 
          success: false, 
          student: studentId, 
          error: individualError.message 
        });
        errorCount++;
      }
    }
    
    console.log(`[BULK MARK] Completed. Success: ${successCount}, Errors: ${errorCount}`);
    console.log('[BULK MARK] Results summary:', results);
    
    // Verify what was actually saved in the database
    const savedRecords = await Attendance.find({
      date: attendanceDate,
      student: { $in: Object.keys(studentAttendanceMap) }
    }).select('student forenoon.periods afternoon.periods');
    
    console.log(`[BULK MARK] Verification: Found ${savedRecords.length} records in database`);
    console.table(savedRecords.map(r => ({
      student: r.student.toString(),
      forenoonPeriods: r.forenoon.periods.length,
      afternoonPeriods: r.afternoon.periods.length,
      totalPeriods: r.forenoon.periods.length + r.afternoon.periods.length
    })));
    
    res.status(200).json({ 
      message: `Attendance processing completed. ${successCount} successful, ${errorCount} failed.`,
      results: {
        totalProcessed: attendanceData.length,
        successCount,
        errorCount,
        details: results
      },
      session,
      date: attendanceDate,
      verification: {
        recordsInDatabase: savedRecords.length,
        expectedRecords: attendanceData.length
      }
    });
    
  } catch (error) {
    console.error('[BULK MARK] General error:', error);
    res.status(500).json({ 
      message: 'Failed to mark bulk attendance', 
      error: error.message, 
      received: req.body 
    });
  }
});

// POST /api/attendance/bulk-mark - Mark attendance for multiple students
router.post('/bulk-mark', authenticateToken, requireActiveAdmin, validateBulkAttendance, async (req, res) => {
  console.log('[BULK MARK] Request received:', {
    body: req.body,
    headers: req.headers
  });
  
  try {
    let { date, attendanceData } = req.body;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required', received: req.body });
    }
    if (!attendanceData || !Array.isArray(attendanceData) || attendanceData.length === 0) {
      return res.status(400).json({ message: 'attendanceData array is required', received: req.body });
    }
    
    // Validate each record's period and status
    for (const record of attendanceData) {
      if (!record.period || ![1,2,3,4,5,6,7].includes(Number(record.period))) {
        return res.status(400).json({ message: 'Valid period (1-7) is required in each record', record });
      }
      if (!record.status || !['present', 'absent', 'late', 'half-day'].includes(record.status)) {
        return res.status(400).json({ message: 'Valid status (present, absent, late, half-day) is required in each record', record });
      }
      if (!record.student) {
        return res.status(400).json({ message: 'Student ID is required in each record', record });
      }
    }
    
    let attendanceDate = new Date(date);
    attendanceDate.setHours(0,0,0,0);
    
    // Log total entries
    console.log(`[BULK MARK] Processing ${attendanceData.length} records for date: ${attendanceDate}`);
    console.log("attendanceData length:", attendanceData.length);
    console.table(attendanceData);
    
    // Group attendance data by student
    const studentAttendanceMap = {};
    attendanceData.forEach(entry => {
      if (!studentAttendanceMap[entry.student]) {
        studentAttendanceMap[entry.student] = { forenoon: [], afternoon: [] };
      }
      
      const periodData = {
        period: Number(entry.period),
        status: entry.status,
        remarks: entry.remarks || ''
      };
      
      if ([1, 2, 3, 4].includes(Number(entry.period))) {
        studentAttendanceMap[entry.student].forenoon.push(periodData);
      } else {
        studentAttendanceMap[entry.student].afternoon.push(periodData);
      }
    });
    
    // Process each student's attendance
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const [studentId, attendanceData] of Object.entries(studentAttendanceMap)) {
      try {
        console.log(`[BULK MARK] Processing student: ${studentId}`);
        console.log(`[BULK MARK] Forenoon periods:`, attendanceData.forenoon);
        console.log(`[BULK MARK] Afternoon periods:`, attendanceData.afternoon);
        
        // Try to find existing record
        const existingAttendance = await Attendance.findOne({
          student: studentId,
          date: attendanceDate
        });
        
        if (existingAttendance) {
          // Update existing record
          existingAttendance.forenoon.periods = attendanceData.forenoon;
          existingAttendance.afternoon.periods = attendanceData.afternoon;
          existingAttendance.markedBy = req.admin._id;
          existingAttendance.updatedAt = new Date();
          await existingAttendance.save();
          
          console.log(`[BULK MARK] Updated existing record for student ${studentId}`);
          results.push({ 
            success: true, 
            action: 'updated',
            student: studentId,
            forenoonPeriods: attendanceData.forenoon.length,
            afternoonPeriods: attendanceData.afternoon.length
          });
          successCount++;
        } else {
          // Create new record
          const attendance = new Attendance({
            student: studentId,
            date: attendanceDate,
            forenoon: { periods: attendanceData.forenoon },
            afternoon: { periods: attendanceData.afternoon },
            markedBy: req.admin._id
          });
          
          await attendance.save();
          
          console.log(`[BULK MARK] Created new record for student ${studentId}`);
          results.push({ 
            success: true, 
            action: 'created',
            student: studentId,
            forenoonPeriods: attendanceData.forenoon.length,
            afternoonPeriods: attendanceData.afternoon.length
          });
          successCount++;
        }
        
      } catch (individualError) {
        console.error(`[BULK MARK] Error processing student ${studentId}:`, individualError);
        results.push({ 
          success: false, 
          student: studentId, 
          error: individualError.message 
        });
        errorCount++;
      }
    }
    
    console.log(`[BULK MARK] Completed. Success: ${successCount}, Errors: ${errorCount}`);
    console.log('[BULK MARK] Results summary:', results);
    
    // Verify what was actually saved in the database
    const savedRecords = await Attendance.find({
      date: attendanceDate,
      student: { $in: Object.keys(studentAttendanceMap) }
    }).select('student forenoon.periods afternoon.periods');
    
    console.log(`[BULK MARK] Verification: Found ${savedRecords.length} records in database`);
    console.table(savedRecords.map(r => ({
      student: r.student.toString(),
      forenoonPeriods: r.forenoon.periods.length,
      afternoonPeriods: r.afternoon.periods.length,
      totalPeriods: r.forenoon.periods.length + r.afternoon.periods.length
    })));
    
    res.status(200).json({ 
      message: `Attendance processing completed. ${successCount} successful, ${errorCount} failed.`,
      results: {
        totalStudents: Object.keys(studentAttendanceMap).length,
        successCount,
        errorCount,
        details: results
      },
      date: attendanceDate,
      verification: {
        recordsInDatabase: savedRecords.length,
        expectedRecords: Object.keys(studentAttendanceMap).length
      }
    });
    
  } catch (error) {
    console.error('[BULK MARK] General error:', error);
    res.status(500).json({ 
      message: 'Failed to mark bulk attendance', 
      error: error.message, 
      received: req.body 
    });
  }
});

// GET /api/attendance/student/:studentId - Get attendance for a specific student
router.get('/student/:studentId', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, date, page = 1, limit = 30 } = req.query;

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        message: 'Student not found'
      });
    }

    // If a specific date is provided, fetch all periods for that date
    if (date) {
      const attendance = await Attendance.getAllPeriodsForStudentAndDate(studentId, date);
      return res.json({
        attendance,
        date
      });
    }

    // Otherwise, use the existing range logic
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

    // Calculate attendance statistics for the selected student
    let totalPeriods = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;

    attendance.forEach(record => {
      // Count forenoon periods
      record.forenoon.periods.forEach(period => {
        totalPeriods++;
        if (period.status === 'present') presentCount++;
        else if (period.status === 'absent') absentCount++;
        else if (period.status === 'late') lateCount++;
        else if (period.status === 'half-day') halfDayCount++;
      });

      // Count afternoon periods
      record.afternoon.periods.forEach(period => {
        totalPeriods++;
        if (period.status === 'present') presentCount++;
        else if (period.status === 'absent') absentCount++;
        else if (period.status === 'late') lateCount++;
        else if (period.status === 'half-day') halfDayCount++;
      });
    });

    // Calculate percentages
    const presentPercentage = totalPeriods > 0 ? Math.round((presentCount / totalPeriods) * 100) : 0;
    const absentPercentage = totalPeriods > 0 ? Math.round((absentCount / totalPeriods) * 100) : 0;
    const latePercentage = totalPeriods > 0 ? Math.round((lateCount / totalPeriods) * 100) : 0;
    const halfDayPercentage = totalPeriods > 0 ? Math.round((halfDayCount / totalPeriods) * 100) : 0;

    res.json({
      attendance,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalRecords: total,
      statistics: {
        totalPeriods,
        present: { count: presentCount, percentage: presentPercentage },
        absent: { count: absentCount, percentage: absentPercentage },
        late: { count: lateCount, percentage: latePercentage },
        halfDay: { count: halfDayCount, percentage: halfDayPercentage }
      }
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

    console.log('Class attendance request:', { className, section, date, session, studentId });

    if (!className || !section || !date) {
      return res.status(400).json({
        message: 'Class name, section, and date are required'
      });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setDate(attendanceDate.getDate() + 1);

    // Get students in class/section - filter by studentId if provided
    let studentQuery = { className, section, isActive: true };
    if (studentId) {
      studentQuery._id = studentId;
    }
    console.log('Student query:', studentQuery);
    
    const students = await Student.find(studentQuery).select('fullName rollNumber className section');
    console.log('Found students:', students.length, students.map(s => ({ id: s._id, name: s.fullName })));
    
    const studentIds = students.map(s => s._id);

    // Get all attendance records for these students on the given date
    let attendanceRecords = await Attendance.find({
      student: { $in: studentIds },
      date: { $gte: attendanceDate, $lt: nextDay }
    });

    console.log('Found attendance records:', attendanceRecords.length);

    // Build period-wise report for each student
    const periods = [1,2,3,4,5,6,7];
    const report = students.map(student => {
      const periodStatus = {};
      const studentAttendance = attendanceRecords.find(a => a.student.toString() === student._id.toString());
      
      periods.forEach(period => {
        if (studentAttendance) {
          // Check forenoon periods (1-4)
          if ([1, 2, 3, 4].includes(period)) {
            const forenoonPeriod = studentAttendance.forenoon.periods.find(p => p.period === period);
            periodStatus[`period${period}`] = forenoonPeriod ? forenoonPeriod.status : 'not-marked';
          } else {
            // Check afternoon periods (5-7)
            const afternoonPeriod = studentAttendance.afternoon.periods.find(p => p.period === period);
            periodStatus[`period${period}`] = afternoonPeriod ? afternoonPeriod.status : 'not-marked';
          }
        } else {
          periodStatus[`period${period}`] = 'not-marked';
        }
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

    console.log('Final report has', report.length, 'students');

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
    if (status && !['present', 'absent', 'late', 'half-day'].includes(status)) {
      return res.status(400).json({ message: 'Valid status (present, absent, late, half-day) is required', received: req.body });
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
    if (remarks !== undefined) attendance.remarks = remarks || '';
    attendance.markedBy = req.admin._id;
    attendance.updatedAt = new Date();
    await attendance.save();
    res.status(200).json({ 
      message: 'Attendance updated successfully', 
      attendance 
    });
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
    if (status && !['present', 'absent', 'late', 'half-day'].includes(status)) {
      return res.status(400).json({ message: 'Valid status (present, absent, late, half-day) is required', received: req.body });
    }
    const allowedPeriods = Attendance.getSessionPeriods(session);
    if (!allowedPeriods.includes(Number(period))) {
      return res.status(400).json({ message: 'Period does not match session', received: req.body });
    }

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { 
        status, 
        remarks: remarks || '', 
        session, 
        period 
      },
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
    if (!className || !section) {
      return res.status(400).json({ message: 'Class name and section are required' });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get students in class/section
    const students = await Student.find({ className, section, isActive: true }).select('fullName rollNumber className section');
    const studentIds = students.map(s => s._id);

    // Get all attendance records for these students in the date range
    const attendanceRecords = await Attendance.find({
      student: { $in: studentIds },
      date: { $gte: start, $lte: end }
    }).populate('student', 'fullName rollNumber className section');

    console.log(`Found ${attendanceRecords.length} attendance records for ${students.length} students`);

    // Get all dates in the range
    const dateList = [];
    let current = new Date(start);
    while (current <= end) {
      dateList.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const periods = [1, 2, 3, 4, 5, 6, 7];
    
    // Group attendance by student and date, per period
    const report = students.map(student => {
      const studentReport = dateList.map(dateObj => {
        const dateStr = dateObj.toISOString().split('T')[0];
        const periodStatus = {};
        
        // Find attendance record for this student and date
        const attendanceRecord = attendanceRecords.find(a => {
          const studentMatch = a.student._id.toString() === student._id.toString();
          const dateMatch = a.date.toISOString().split('T')[0] === dateStr;
          return studentMatch && dateMatch;
        });
        
        periods.forEach(period => {
          if (attendanceRecord) {
            // Check forenoon periods (1-4)
            if (period <= 4) {
              const forenoonPeriod = attendanceRecord.forenoon.periods.find(p => p.period === period);
              periodStatus[`period${period}`] = forenoonPeriod ? forenoonPeriod.status : 'not-marked';
            } else {
              // Check afternoon periods (5-7)
              const afternoonPeriod = attendanceRecord.afternoon.periods.find(p => p.period === period);
              periodStatus[`period${period}`] = afternoonPeriod ? afternoonPeriod.status : 'not-marked';
            }
          } else {
            periodStatus[`period${period}`] = 'not-marked';
          }
        });
        
        return {
          date: dateStr,
          ...periodStatus
        };
      });
      
      // Calculate total attendance for this student
      let totalPresent = 0;
      let totalMarked = 0;
      
      studentReport.forEach(dateData => {
        periods.forEach(period => {
          const status = dateData[`period${period}`];
          if (status && status !== 'not-marked') {
            totalMarked++;
            if (status === 'present') {
              totalPresent++;
            }
          }
        });
      });
      
      const totalAttendancePercentage = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;
      
      return {
        studentId: student._id,
        fullName: student.fullName,
        rollNumber: student.rollNumber,
        className: student.className,
        section: student.section,
        attendance: studentReport,
        totalAttendance: {
          present: totalPresent,
          marked: totalMarked,
          percentage: totalAttendancePercentage
        }
      };
    });
    
    // Calculate overall statistics
    let totalPresentPeriods = 0;
    let totalMarkedPeriods = 0;
    let studentsWithGoodAttendance = 0;
    let studentsWithAverageAttendance = 0;
    let studentsWithPoorAttendance = 0;
    let studentsWithNoAttendance = 0;
    
    report.forEach(student => {
      if (student.totalAttendance.marked > 0) {
        totalPresentPeriods += student.totalAttendance.present;
        totalMarkedPeriods += student.totalAttendance.marked;
        
        const percentage = student.totalAttendance.percentage;
        if (percentage >= 75) {
          studentsWithGoodAttendance++;
        } else if (percentage >= 50) {
          studentsWithAverageAttendance++;
        } else {
          studentsWithPoorAttendance++;
        }
      } else {
        studentsWithNoAttendance++;
      }
    });
    
    const overallStats = {
      totalStudents: students.length,
      totalPresentPeriods,
      totalMarkedPeriods,
      averageAttendance: totalMarkedPeriods > 0 ? Math.round((totalPresentPeriods / totalMarkedPeriods) * 100) : 0,
      studentsWithGoodAttendance,
      studentsWithAverageAttendance,
      studentsWithPoorAttendance,
      studentsWithNoAttendance
    };
    
    console.log(`Generated report for ${report.length} students with ${dateList.length} dates`);
    console.log('Overall stats:', overallStats);
    
    res.json({ 
      startDate, 
      endDate, 
      report, 
      dates: dateList.map(d => d.toISOString().split('T')[0]), 
      periods,
      totalStudents: students.length,
      totalRecords: attendanceRecords.length,
      overallStats
    });
  } catch (error) {
    console.error('Get range attendance report error:', error);
    res.status(500).json({ message: 'Failed to fetch range attendance report', error: error.message });
  }
});

// GET /api/attendance/export-excel - Export class attendance as Excel file
router.get('/export-excel', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const { className, section, date } = req.query;
    if (!className || !section || !date) {
      return res.status(400).json({ message: 'Class name, section, and date are required' });
    }
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setDate(attendanceDate.getDate() + 1);

    // Get students in class/section
    const students = await Student.find({ className, section, isActive: true }).select('fullName rollNumber className section');
    const studentIds = students.map(s => s._id);

    // Get all attendance records for these students on the given date
    let attendanceRecords = await Attendance.find({
      student: { $in: studentIds },
      date: { $gte: attendanceDate, $lt: nextDay }
    });

    // Build period-wise report for each student
    const periods = [1,2,3,4,5,6,7];
    const report = students.map(student => {
      const periodStatus = {};
      periods.forEach(period => {
        const rec = attendanceRecords.find(a => a.student.toString() === student._id.toString() && a.period === period);
        periodStatus[`P${period}`] = rec ? rec.status : 'not-marked';
      });
      return {
        name: student.fullName,
        roll: student.rollNumber,
        class: student.className,
        section: student.section,
        ...periodStatus
      };
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');
    worksheet.columns = [
      { header: 'Student Name', key: 'name', width: 20 },
      { header: 'Roll Number', key: 'roll', width: 15 },
      { header: 'Class', key: 'class', width: 10 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'P1', key: 'P1', width: 12 },
      { header: 'P2', key: 'P2', width: 12 },
      { header: 'P3', key: 'P3', width: 12 },
      { header: 'P4', key: 'P4', width: 12 },
      { header: 'P5', key: 'P5', width: 12 },
      { header: 'P6', key: 'P6', width: 12 },
      { header: 'P7', key: 'P7', width: 12 }
    ];
    report.forEach(row => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.eachRow((row, rowNumber) => {
      row.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Attendance_${className}_${section}_${date}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({ message: 'Failed to export attendance Excel', error: error.message });
  }
});

// GET /api/attendance/date-range-report - Get attendance report for a class/section over a date range
router.get('/date-range-report', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const { startDate, endDate, className, section } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    if (!className || !section) {
      return res.status(400).json({ message: 'Class name and section are required' });
    }

    // Validate date format
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    if (start > end) {
      return res.status(400).json({ message: 'Start date cannot be after end date' });
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Get students in class/section
    const students = await Student.find({ className, section, isActive: true }).select('fullName rollNumber className section');
    
    if (students.length === 0) {
      return res.status(404).json({ message: 'No students found for the specified class and section' });
    }
    
    const studentIds = students.map(s => s._id);

    // Get all attendance records for these students in the date range
    const attendanceRecords = await Attendance.find({
      student: { $in: studentIds },
      date: { $gte: start, $lte: end }
    }).populate('student', 'fullName rollNumber className section');

    // Get all dates in the range
    const dateList = [];
    let current = new Date(start);
    while (current <= end) {
      dateList.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    // Build report for each student
    const report = students.map(student => {
      const studentAttendance = {};
      
      // For each date in the range
      dateList.forEach(dateObj => {
        const dateStr = dateObj.toISOString().split('T')[0];
        const attendanceRecord = attendanceRecords.find(a => 
          a.student._id.toString() === student._id.toString() && 
          a.date.toISOString().split('T')[0] === dateStr
        );
        
        if (attendanceRecord) {
          // Check if student has any marked periods for this date
          const totalMarkedPeriods = attendanceRecord.forenoon.periods.length + attendanceRecord.afternoon.periods.length;
          if (totalMarkedPeriods > 0) {
            // Calculate attendance percentage
            const totalPresent = attendanceRecord.forenoon.periods.filter(p => p.status === 'present').length +
                               attendanceRecord.afternoon.periods.filter(p => p.status === 'present').length;
            const percentage = Math.round((totalPresent / totalMarkedPeriods) * 100);
            studentAttendance[dateStr] = `${totalPresent}/${totalMarkedPeriods} (${percentage}%)`;
          } else {
            studentAttendance[dateStr] = 'not-marked';
          }
        } else {
          studentAttendance[dateStr] = 'not-marked';
        }
      });

      return {
        studentId: student._id,
        fullName: student.fullName,
        rollNumber: student.rollNumber,
        className: student.className,
        section: student.section,
        attendance: studentAttendance
      };
    });

    res.json({ 
      startDate, 
      endDate, 
      report, 
      dates: dateList.map(d => d.toISOString().split('T')[0]),
      totalStudents: students.length,
      totalDates: dateList.length,
      totalRecords: attendanceRecords.length
    });

  } catch (error) {
    console.error('Get date range attendance report error:', error);
    res.status(500).json({ message: 'Failed to fetch date range attendance report', error: error.message });
  }
});

// GET /api/attendance/export-date-range-excel - Export date range attendance as Excel file
router.get('/export-date-range-excel', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const { startDate, endDate, className, section } = req.query;
    if (!startDate || !endDate || !className || !section) {
      return res.status(400).json({ message: 'Start date, end date, class name, and section are required' });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get students in class/section
    const students = await Student.find({ className, section, isActive: true }).select('fullName rollNumber className section');
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

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Date Range Attendance');

    // Define columns
    const columns = [
      { header: 'Student Name', key: 'name', width: 20 },
      { header: 'Roll Number', key: 'roll', width: 15 },
      { header: 'Class', key: 'class', width: 10 },
      { header: 'Section', key: 'section', width: 10 }
    ];

    // Add date columns
    dateList.forEach(dateObj => {
      const dateStr = dateObj.toISOString().split('T')[0];
      columns.push({ header: dateStr, key: dateStr, width: 15 });
    });

    worksheet.columns = columns;

    // Add data rows
    students.forEach(student => {
      const rowData = {
        name: student.fullName,
        roll: student.rollNumber,
        class: student.className,
        section: student.section
      };

      // Add attendance data for each date
      dateList.forEach(dateObj => {
        const dateStr = dateObj.toISOString().split('T')[0];
        const attendanceRecord = attendanceRecords.find(a => 
          a.student.toString() === student._id.toString() && 
          a.date.toISOString().split('T')[0] === dateStr
        );
        
        if (attendanceRecord) {
          const totalMarkedPeriods = attendanceRecord.forenoon.periods.length + attendanceRecord.afternoon.periods.length;
          if (totalMarkedPeriods > 0) {
            const totalPresent = attendanceRecord.forenoon.periods.filter(p => p.status === 'present').length +
                               attendanceRecord.afternoon.periods.filter(p => p.status === 'present').length;
            const percentage = Math.round((totalPresent / totalMarkedPeriods) * 100);
            rowData[dateStr] = `${totalPresent}/${totalMarkedPeriods} (${percentage}%)`;
          } else {
            rowData[dateStr] = 'not-marked';
          }
        } else {
          rowData[dateStr] = 'not-marked';
        }
      });

      worksheet.addRow(rowData);
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Style all rows
    worksheet.eachRow((row, rowNumber) => {
      row.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=DateRangeAttendance_${className}_${section}_${startDate}_to_${endDate}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export date range Excel error:', error);
    res.status(500).json({ message: 'Failed to export date range attendance Excel', error: error.message });
  }
});

// DEBUG: Get raw attendance records for a class, section, and date
router.get('/debug/raw-records', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const { className, section, date } = req.query;
    if (!className || !section || !date) {
      return res.status(400).json({ message: 'Class name, section, and date are required' });
    }
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setDate(attendanceDate.getDate() + 1);

    // Find students in class/section
    const students = await Student.find({ className, section, isActive: true }).select('_id fullName rollNumber');
    const studentIds = students.map(s => s._id);

    // Find all attendance records for these students on the given date
    const records = await Attendance.find({
      student: { $in: studentIds },
      date: { $gte: attendanceDate, $lt: nextDay }
    }).populate('student', 'fullName rollNumber className section');

    // Transform records to show periods in a flat structure
    const flatRecords = [];
    records.forEach(record => {
      // Add forenoon periods
      record.forenoon.periods.forEach(period => {
        flatRecords.push({
          student: record.student,
          period: period.period,
          session: 'forenoon',
          status: period.status,
          remarks: period.remarks,
          date: record.date
        });
      });
      
      // Add afternoon periods
      record.afternoon.periods.forEach(period => {
        flatRecords.push({
          student: record.student,
          period: period.period,
          session: 'afternoon',
          status: period.status,
          remarks: period.remarks,
          date: record.date
        });
      });
    });

    res.json({
      count: records.length,
      flatRecordsCount: flatRecords.length,
      records: records,
      flatRecords: flatRecords
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch raw records', error: error.message });
  }
});

// GET /api/attendance/student-report - Get detailed attendance report for a specific student
router.get('/student-report', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const { studentId, startDate, endDate } = req.query;
    if (!studentId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Student ID, start date, and end date are required' });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        message: 'Student not found'
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all attendance records for this student in the date range
    const attendanceRecords = await Attendance.find({
      student: studentId,
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });

    // Build detailed report with period-wise data
    const detailedReport = [];
    let totalPeriods = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;

    attendanceRecords.forEach(record => {
      // Process forenoon periods
      record.forenoon.periods.forEach(period => {
        totalPeriods++;
        if (period.status === 'present') presentCount++;
        else if (period.status === 'absent') absentCount++;
        else if (period.status === 'late') lateCount++;
        else if (period.status === 'half-day') halfDayCount++;

        detailedReport.push({
          date: record.date.toISOString().split('T')[0],
          period: period.period,
          periodLabel: `P${period.period} (${Attendance.getPeriodTiming(period.period)})`,
          status: period.status,
          remarks: period.remarks || '',
          session: 'forenoon'
        });
      });

      // Process afternoon periods
      record.afternoon.periods.forEach(period => {
        totalPeriods++;
        if (period.status === 'present') presentCount++;
        else if (period.status === 'absent') absentCount++;
        else if (period.status === 'late') lateCount++;
        else if (period.status === 'half-day') halfDayCount++;

        detailedReport.push({
          date: record.date.toISOString().split('T')[0],
          period: period.period,
          periodLabel: `P${period.period} (${Attendance.getPeriodTiming(period.period)})`,
          status: period.status,
          remarks: period.remarks || '',
          session: 'afternoon'
        });
      });
    });

    // Calculate percentages
    const presentPercentage = totalPeriods > 0 ? Math.round((presentCount / totalPeriods) * 100) : 0;
    const absentPercentage = totalPeriods > 0 ? Math.round((absentCount / totalPeriods) * 100) : 0;
    const latePercentage = totalPeriods > 0 ? Math.round((lateCount / totalPeriods) * 100) : 0;
    const halfDayPercentage = totalPeriods > 0 ? Math.round((halfDayCount / totalPeriods) * 100) : 0;

    res.json({
      student: {
        _id: student._id,
        fullName: student.fullName,
        rollNumber: student.rollNumber,
        className: student.className,
        section: student.section
      },
      dateRange: {
        startDate,
        endDate
      },
      detailedReport,
      statistics: {
        totalPeriods,
        present: { count: presentCount, percentage: presentPercentage },
        absent: { count: absentCount, percentage: absentPercentage },
        late: { count: lateCount, percentage: latePercentage },
        halfDay: { count: halfDayCount, percentage: halfDayPercentage }
      }
    });

  } catch (error) {
    console.error('Get student report error:', error);
    res.status(500).json({ message: 'Failed to fetch student attendance report' });
  }
});

// POST /api/attendance/send-csv-report - Send CSV report via email
router.post('/send-csv-report', authenticateToken, requireActiveAdmin, async (req, res) => {
  try {
    const { reportType, reportData, email, fileName } = req.body;
    
    if (!reportType || !reportData || !email) {
      return res.status(400).json({
        message: 'Missing required fields: reportType, reportData, email'
      });
    }

    // Generate CSV content
    let csvContent = '';
    let subject = '';
    let emailTemplate = '';

    if (reportType === 'daily') {
      const { headers, rows, date, className, section } = reportData;
      console.log('Processing daily report data:', {
        headers: headers,
        rows: rows,
        date: date,
        className: className,
        section: section
      });
      
      // Check if we have valid data
      if (!headers || !rows || headers.length === 0 || rows.length === 0) {
        console.error('No valid data provided for CSV generation');
        return res.status(400).json({
          message: 'No valid attendance data found. Please generate a report first.'
        });
      }
      
      csvContent = generateCSVContent(headers, rows);
      console.log('Generated CSV content for daily report:', {
        headers: headers?.length || 0,
        rows: rows?.length || 0,
        csvContentLength: csvContent?.length || 0,
        csvContentPreview: csvContent?.substring(0, 200) + '...'
      });
      subject = `📊 Daily Attendance Report - ${className} Section ${section} - ${date}`;
      emailTemplate = 'csvReportEmail';
    } else if (reportType === 'range') {
      const { headers, rows, startDate, endDate, className, section } = reportData;
      
      // Check if we have valid data
      if (!headers || !rows || headers.length === 0 || rows.length === 0) {
        console.error('No valid data provided for CSV generation');
        return res.status(400).json({
          message: 'No valid attendance data found. Please generate a report first.'
        });
      }
      
      csvContent = generateCSVContent(headers, rows);
      console.log('Generated CSV content for range report:', {
        headers: headers?.length || 0,
        rows: rows?.length || 0,
        csvContentLength: csvContent?.length || 0,
        csvContentPreview: csvContent?.substring(0, 200) + '...'
      });
      subject = `📊 Date Range Attendance Report - ${className} Section ${section} - ${startDate} to ${endDate}`;
      emailTemplate = 'csvReportEmail';
    } else if (reportType === 'student') {
      const { headers, rows, studentName, startDate, endDate } = reportData;
      
      // Check if we have valid data
      if (!headers || !rows || headers.length === 0 || rows.length === 0) {
        console.error('No valid data provided for CSV generation');
        return res.status(400).json({
          message: 'No valid attendance data found. Please generate a report first.'
        });
      }
      
      csvContent = generateCSVContent(headers, rows);
      console.log('Generated CSV content for student report:', {
        headers: headers?.length || 0,
        rows: rows?.length || 0,
        csvContentLength: csvContent?.length || 0,
        csvContentPreview: csvContent?.substring(0, 200) + '...'
      });
      subject = `📊 Student Attendance Report - ${studentName} - ${startDate} to ${endDate}`;
      emailTemplate = 'csvReportEmail';
    } else {
      return res.status(400).json({
        message: 'Invalid report type'
      });
    }

    // Send email with CSV attachment
    console.log('Sending email with data:', {
      email,
      subject,
      reportType,
      reportData: {
        rows: reportData.rows ? reportData.rows.length : 0,
        headers: reportData.headers ? reportData.headers.length : 0,
        className: reportData.className,
        section: reportData.section,
        date: reportData.date,
        startDate: reportData.startDate,
        endDate: reportData.endDate,
        studentName: reportData.studentName
      }
    });
    
    // Debug the actual data structure
    console.log('Full reportData structure:', JSON.stringify(reportData, null, 2));
    
    // Test CSV generation with sample data if no data provided
    if (!reportData.headers || !reportData.rows || reportData.headers.length === 0 || reportData.rows.length === 0) {
      console.log('No valid data provided, testing with sample data...');
      const testHeaders = ['Name', 'Roll Number', 'Class', 'Section', 'Status'];
      const testRows = [
        ['John Doe', '123', '10th', 'A', 'Present'],
        ['Jane Smith', '124', '10th', 'A', 'Absent']
      ];
      const testCsv = generateCSVContent(testHeaders, testRows);
      console.log('Test CSV generated:', testCsv);
    }
    
    const emailResult = await sendEmail(email, emailTemplate, [
      subject,
      csvContent,
      fileName || 'attendance_report.csv',
      reportType,
      reportData
    ]);

    if (emailResult.success) {
      res.json({
        message: 'CSV report sent successfully via email',
        messageId: emailResult.messageId
      });
    } else {
      res.status(500).json({
        message: 'Failed to send CSV report via email',
        error: emailResult.error
      });
    }

  } catch (error) {
    console.error('Send CSV report error:', error);
    res.status(500).json({
      message: 'Failed to send CSV report via email',
      error: error.message
    });
  }
});

// Helper function to generate CSV content
function generateCSVContent(headers, rows) {
  console.log('generateCSVContent called with:', {
    headers: headers?.length || 0,
    rows: rows?.length || 0,
    headersSample: headers?.slice(0, 3),
    rowsSample: rows?.slice(0, 2)
  });
  
  let csvContent = '';
  
  // Add metadata header
  csvContent += '"KONGU ENGINEERING COLLEGE - ATTENDANCE REPORT"\n';
  csvContent += `"Generated on: ${new Date().toLocaleString('en-IN')}"\n`;
  csvContent += `"Total Records: ${rows?.length || 0}"\n`;
  csvContent += '""\n'; // Empty line for spacing
  
  // Add headers
  if (headers && headers.length > 0) {
    csvContent += headers.map(header => `"${header}"`).join(',') + '\n';
  }
  
  // Add data rows
  if (rows && rows.length > 0) {
    rows.forEach(row => {
      csvContent += row.map(field => `"${(field ?? '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
    });
  }
  
  // Add summary footer
  csvContent += '""\n'; // Empty line for spacing
  csvContent += '"Report Summary:"\n';
  csvContent += `"Total Students: ${rows?.length || 0}"\n`;
  csvContent += `"Report Generated: ${new Date().toLocaleString('en-IN')}"\n`;
  csvContent += '"© 2024 Kongu Engineering College. All rights reserved."\n';
  
  console.log('Generated CSV content length:', csvContent.length);
  console.log('CSV content preview:', csvContent.substring(0, 300) + '...');
  
  return csvContent;
}

module.exports = router; 