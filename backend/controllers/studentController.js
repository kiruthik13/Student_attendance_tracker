const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const Subject = require('../models/Subject');

// Helper to finding student profile from logged in User
const getStudentProfile = async (email) => {
    return await Student.findOne({ email: email.toLowerCase() });
};

// GET /student/dashboard
exports.getDashboardStats = async (req, res) => {
    try {
        const student = await getStudentProfile(req.user.email);
        if (!student) {
            return res.status(404).json({ message: 'Student profile not linked to this account' });
        }

        // 1. Attendance % (Overall)
        // Calculate from all attendance records
        const attendanceRecords = await Attendance.find({ student: student._id });
        let totalPeriods = 0;
        let present = 0;

        attendanceRecords.forEach(record => {
            // Count forenoon
            record.forenoon.periods.forEach(p => {
                totalPeriods++;
                if (p.status === 'present') present++;
            });
            // Count afternoon
            record.afternoon.periods.forEach(p => {
                totalPeriods++;
                if (p.status === 'present') present++;
            });
        });

        const attendancePercentage = totalPeriods > 0 ? ((present / totalPeriods) * 100).toFixed(1) : 0;

        // 2. Total Subjects
        // Assuming student has subjects based on class/section, or just count all subjects for now?
        // User didn't specify class-subject mapping, so we count total subjects or marks.
        // Let's count subjects they have marks for, or just all subjects if generic.
        // Better: Count unique subjects in Marks collection for this student? 
        // Or just Total Subject count in system? "Total subjects" usually means enrolled subjects.
        // Let's return total subjects in system for now (simple).
        const totalSubjects = await Subject.countDocuments();

        // 3. Total Marks Received
        const marks = await Mark.find({ studentId: student._id });
        const totalMarks = marks.reduce((sum, mark) => sum + mark.marksObtained, 0);

        res.json({
            studentName: student.fullName,
            rollNumber: student.rollNumber,
            stats: {
                attendancePercentage,
                totalSubjects,
                totalMarks
            }
        });

    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /student/attendance
exports.getAttendance = async (req, res) => {
    try {
        const student = await getStudentProfile(req.user.email);
        if (!student) return res.status(404).json({ message: 'Student profile not found' });

        const { month, year } = req.query;
        // Filter by month/year if provided

        let query = { student: student._id };
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            query.date = { $gte: startDate, $lte: endDate };
        }

        const attendance = await Attendance.find(query).sort({ date: -1 });

        // Transform for UI (Daily status)
        // A day is "Present" if present in all marked periods? Or calculate % per day?
        // Simple View: Table with Date, Status.
        // Logic: If any period is 'absent', day is 'Absent' or 'Partial'? 
        // Let's show "Present" if > 50% periods present, else "Absent".
        const history = attendance.map(record => {
            let pCount = 0;
            let total = 0;
            [...record.forenoon.periods, ...record.afternoon.periods].forEach(p => {
                total++;
                if (p.status === 'present') pCount++;
            });

            const status = total === 0 ? 'Holiday' : (pCount === total ? 'Present' : (pCount > 0 ? 'Partial' : 'Absent'));

            return {
                date: record.date,
                status,
                periodsPresent: pCount,
                totalPeriods: total
            };
        });

        res.json({ attendance: history });

    } catch (error) {
        console.error('Attendance Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /student/marks
exports.getMarks = async (req, res) => {
    try {
        const student = await getStudentProfile(req.user.email);
        if (!student) return res.status(404).json({ message: 'Student profile not found' });

        const marks = await Mark.find({ studentId: student._id })
            .populate('subjectId', 'name code maxMarks')
            .sort({ createdAt: -1 });

        const formattedMarks = marks.map(m => ({
            subjectName: m.subjectId.name,
            subjectCode: m.subjectId.code,
            examType: m.examType,
            marksObtained: m.marksObtained,
            maxMarks: m.subjectId.maxMarks,
            percentage: ((m.marksObtained / m.subjectId.maxMarks) * 100).toFixed(2)
        }));

        res.json({ marks: formattedMarks });

    } catch (error) {
        console.error('Marks Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
// GET /student/profile
exports.getProfile = async (req, res) => {
    try {
        const student = await getStudentProfile(req.user.email);
        if (!student) return res.status(404).json({ message: 'Student profile not found' });

        res.json({ student });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
