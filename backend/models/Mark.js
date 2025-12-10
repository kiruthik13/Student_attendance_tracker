const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: [true, 'Student ID is required']
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: [true, 'Subject ID is required']
    },
    examType: {
        type: String,
        required: [true, 'Exam type is required'],
        enum: ['Internal 1', 'Internal 2', 'Semester', 'Assignment', 'Other'], // Extended for flexibility
        trim: true
    },
    marksObtained: {
        type: Number,
        required: [true, 'Marks obtained is required'],
        min: [0, 'Marks cannot be negative']
    },
    term: {
        type: String,
        default: 'Current',
        trim: true
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

// Compound index to prevent duplicate marks for the same student, subject, and exam
markSchema.index({ studentId: 1, subjectId: 1, examType: 1 }, { unique: true });

module.exports = mongoose.model('Mark', markSchema);
