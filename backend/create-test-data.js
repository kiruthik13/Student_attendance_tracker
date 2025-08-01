const mongoose = require('mongoose');
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');
const Admin = require('./models/Admin');

// MongoDB connection
const mongoUri = 'mongodb+srv://mrbairavan:kiruthik13@cluster0.fhhvceb.mongodb.net/student-attendance-tracker';

async function createTestData() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Create test admin if not exists
    let admin = await Admin.findOne({ email: 'test@admin.com' });
    if (!admin) {
      admin = new Admin({
        fullName: 'Test Admin',
        email: 'test@admin.com',
        password: 'test123',
        isActive: true
      });
      await admin.save();
      console.log('✅ Created test admin');
    }

    // Create test students if not exist
    const testStudents = [
      {
        fullName: 'SHANDEEP',
        rollNumber: '22isr046',
        className: 'msc',
        section: '4',
        email: 'shandeep@test.com',
        phone: '1234567890',
        isActive: true
      },
      {
        fullName: 'VIMAL',
        rollNumber: '22isr047',
        className: 'msc',
        section: '4',
        email: 'vimal@test.com',
        phone: '1234567891',
        isActive: true
      },
      {
        fullName: 'Deepan',
        rollNumber: '22isr048',
        className: 'msc',
        section: '4',
        email: 'deepan@test.com',
        phone: '1234567892',
        isActive: true
      },
      {
        fullName: 'Mani',
        rollNumber: '22isr049',
        className: 'msc',
        section: '4',
        email: 'mani@test.com',
        phone: '1234567893',
        isActive: true
      },
      {
        fullName: 'kamales',
        rollNumber: '22isr050',
        className: 'msc',
        section: '4',
        email: 'kamales@test.com',
        phone: '1234567894',
        isActive: true
      },
      {
        fullName: 'Deepakraja',
        rollNumber: '22isr051',
        className: 'msc',
        section: '4',
        email: 'deepakraja@test.com',
        phone: '1234567895',
        isActive: true
      },
      {
        fullName: 'Abinaya',
        rollNumber: '22isr052',
        className: 'msc',
        section: '4',
        email: 'abinaya@test.com',
        phone: '1234567896',
        isActive: true
      },
      {
        fullName: 'naveen',
        rollNumber: '22isr053',
        className: 'msc',
        section: '4',
        email: 'naveen@test.com',
        phone: '1234567897',
        isActive: true
      }
    ];

    const createdStudents = [];
    for (const studentData of testStudents) {
      let student = await Student.findOne({ rollNumber: studentData.rollNumber });
      if (!student) {
        student = new Student(studentData);
        await student.save();
        console.log(`✅ Created student: ${student.fullName}`);
      }
      createdStudents.push(student);
    }

    // Create test attendance data for the last 3 days
    const today = new Date();
    const dates = [
      new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      today // today
    ];

    for (const date of dates) {
      date.setHours(0, 0, 0, 0);
      
      for (const student of createdStudents) {
        // Check if attendance already exists for this student and date
        const existingAttendance = await Attendance.findOne({
          student: student._id,
          date: {
            $gte: date,
            $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
          }
        });

        if (!existingAttendance) {
          // Create random attendance data
          const forenoonPeriods = [];
          const afternoonPeriods = [];

          // Forenoon periods (1-4)
          for (let period = 1; period <= 4; period++) {
            const statuses = ['present', 'absent', 'late', 'half-day'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            forenoonPeriods.push({
              period,
              status: randomStatus,
              remarks: randomStatus === 'late' ? 'Late arrival' : ''
            });
          }

          // Afternoon periods (5-7)
          for (let period = 5; period <= 7; period++) {
            const statuses = ['present', 'absent', 'late', 'half-day'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            afternoonPeriods.push({
              period,
              status: randomStatus,
              remarks: randomStatus === 'late' ? 'Late arrival' : ''
            });
          }

          const attendance = new Attendance({
            student: student._id,
            date: date,
            forenoon: { periods: forenoonPeriods },
            afternoon: { periods: afternoonPeriods },
            markedBy: admin._id
          });

          await attendance.save();
          console.log(`✅ Created attendance for ${student.fullName} on ${date.toISOString().split('T')[0]}`);
        }
      }
    }

    console.log('🎉 Test data creation completed!');
    console.log(`📊 Created ${createdStudents.length} students`);
    console.log(`📅 Created attendance records for ${dates.length} days`);
    console.log('🔗 You can now test the attendance report functionality');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createTestData(); 