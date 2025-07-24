const mongoose = require('mongoose');
const config = require('../config/config');
const Attendance = require('../models/Attendance');

async function deleteAllAttendance() {
  try {
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const result = await Attendance.deleteMany({});
    console.log(`Deleted ${result.deletedCount} attendance records.`);
  } catch (err) {
    console.error('Error deleting attendance records:', err);
  } finally {
    await mongoose.disconnect();
  }
}

deleteAllAttendance(); 