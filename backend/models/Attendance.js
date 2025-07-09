const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student reference is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  session: {
    type: String,
    enum: ['forenoon', 'afternoon'],
    required: [true, 'Session is required'],
    default: 'forenoon'
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day'],
    required: [true, 'Attendance status is required'],
    default: 'present'
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [200, 'Remarks cannot exceed 200 characters']
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Admin who marked attendance is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one attendance record per student per date and session
attendanceSchema.index({ student: 1, date: 1, session: 1 }, { unique: true });

// Static method to find attendance by student and date
attendanceSchema.statics.findByStudentAndDate = function(studentId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.findOne({
    student: studentId,
    date: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  });
};

// Static method to get attendance for a student in a date range
attendanceSchema.statics.getStudentAttendance = function(studentId, startDate, endDate) {
  return this.find({
    student: studentId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).populate('student', 'fullName rollNumber className section');
};

// Static method to get attendance for a class on a specific date
attendanceSchema.statics.getClassAttendance = function(className, section, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    date: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  }).populate({
    path: 'student',
    match: { className: className, section: section },
    select: 'fullName rollNumber className section'
  });
};

// Static method to get attendance statistics for a student
attendanceSchema.statics.getStudentStats = async function(studentId, startDate, endDate) {
  const attendance = await this.find({
    student: studentId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  });

  const total = attendance.length;
  const present = attendance.filter(a => a.status === 'present').length;
  const absent = attendance.filter(a => a.status === 'absent').length;
  const late = attendance.filter(a => a.status === 'late').length;
  const halfDay = attendance.filter(a => a.status === 'half-day').length;

  return {
    total,
    present,
    absent,
    late,
    halfDay,
    percentage: total > 0 ? Math.round((present / total) * 100) : 0
  };
};

module.exports = mongoose.model('Attendance', attendanceSchema); 