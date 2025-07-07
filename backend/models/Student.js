const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters long'],
    maxlength: [50, 'Full name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  rollNumber: {
    type: String,
    required: [true, 'Roll number is required'],
    unique: true,
    trim: true
  },
  className: {
    type: String,
    required: [true, 'Class is required'],
    trim: true
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    trim: true,
    maxlength: [2, 'Section cannot exceed 2 characters']
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  parentName: {
    type: String,
    trim: true,
    maxlength: [50, 'Parent name cannot exceed 50 characters']
  },
  parentPhone: {
    type: String,
    trim: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  isActive: {
    type: Boolean,
    default: true
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

// Static method to find student by email
studentSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find student by roll number
studentSchema.statics.findByRollNumber = function(rollNumber) {
  return this.findOne({ rollNumber: rollNumber });
};

// Static method to check if email exists
studentSchema.statics.emailExists = async function(email) {
  const student = await this.findOne({ email: email.toLowerCase() });
  return !!student;
};

// Static method to check if roll number exists
studentSchema.statics.rollNumberExists = async function(rollNumber) {
  const student = await this.findOne({ rollNumber: rollNumber });
  return !!student;
};

// Instance method to get public profile
studentSchema.methods.getPublicProfile = function() {
  const studentObject = this.toObject();
  return studentObject;
};

module.exports = mongoose.model('Student', studentSchema); 