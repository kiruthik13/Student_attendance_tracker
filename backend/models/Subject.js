const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Subject name is required'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Subject code is required'],
        unique: true,
        trim: true,
        uppercase: true
    },
    maxMarks: {
        type: Number,
        default: 100,
        min: [1, 'Max marks must be at least 1'],
        max: [1000, 'Max marks cannot exceed 1000'] // Allowing up to 1000 for flexibility, though usually 100
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

module.exports = mongoose.model('Subject', subjectSchema);
