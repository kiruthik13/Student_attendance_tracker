const express = require('express');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { authenticateToken, requireActiveAdmin } = require('../middleware/auth');
const {
  validateAttendanceMarking,
  validateBulkAttendance
} = require('../middleware/validation');
const ExcelJS = require('exceljs'); // Add at the top with other requires

const router = express.Router();

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
    
    for (const entry of attendanceData) {
      try {
        // Determine session based on period for 'all' session
        let recordSession = session;
        if (session === 'all') {
          recordSession = [1, 2, 3, 4].includes(Number(entry.period)) ? 'forenoon' : 'afternoon';
        }
        
        console.log(`[BULK MARK] Processing record: Student=${entry.student}, Period=${entry.period}, Session=${recordSession}, Status=${entry.status}`);
        
        // Try to find existing record
        const existingAttendance = await Attendance.findOne({
          student: entry.student,
          date: attendanceDate,
          session: recordSession,
          period: Number(entry.period)
        });
        
        if (existingAttendance) {
          // Update existing record
          existingAttendance.status = entry.status;
          existingAttendance.remarks = entry.remarks || '';
          existingAttendance.markedBy = req.admin._id;
          existingAttendance.updatedAt = new Date();
          await existingAttendance.save();
          
          console.log(`[BULK MARK] Updated existing record for period ${entry.period}`);
          results.push({ 
            success: true, 
            action: 'updated',
            period: entry.period, 
            student: entry.student,
            session: recordSession,
            status: entry.status
          });
          successCount++;
        } else {
          // Create new record
          const attendance = new Attendance({
            student: entry.student,
            date: attendanceDate,
            session: recordSession,
            period: Number(entry.period),
            status: entry.status,
            remarks: entry.remarks || '',
            markedBy: req.admin._id
          });
          
          await attendance.save();
          
          console.log(`[BULK MARK] Created new record for period ${entry.period}`);
          results.push({ 
            success: true, 
            action: 'created',
            period: entry.period, 
            student: entry.student,
            session: recordSession,
            status: entry.status
          });
          successCount++;
        }
        
      } catch (individualError) {
        console.error(`[BULK MARK] Error processing period ${entry.period}:`, individualError);
        results.push({ 
          success: false, 
          period: entry.period, 
          student: entry.student, 
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
      student: { $in: attendanceData.map(entry => entry.student) }
    }).select('student period session status');
    
    console.log(`[BULK MARK] Verification: Found ${savedRecords.length} records in database`);
    console.table(savedRecords.map(r => ({
      student: r.student.toString(),
      period: r.period,
      session: r.session,
      status: r.status
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

    // Build report for each student
    const report = students.map(student => {
      const studentAttendance = {};
      
      // For each date in the range
      dateList.forEach(dateObj => {
        const dateStr = dateObj.toISOString().split('T')[0];
        const attendanceRecord = attendanceRecords.find(a => 
          a.student.toString() === student._id.toString() && 
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
      totalStudents: students.length
    });

  } catch (error) {
    console.error('Get date range attendance report error:', error);
    res.status(500).json({ message: 'Failed to fetch date range attendance report' });
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

module.exports = router; 