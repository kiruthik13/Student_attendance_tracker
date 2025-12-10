const express = require('express');
const router = express.Router();
const Mark = require('../models/Mark');
const Student = require('../models/Student'); // To verify student exists
const Subject = require('../models/Subject'); // To verify subject exists
const { check, validationResult } = require('express-validator');
const { authenticateAdmin, requireActiveAdmin } = require('../middleware/auth');

// Protect all routes
router.use(authenticateAdmin, requireActiveAdmin);

// @route   GET /api/marks
// @desc    Get marks with filters
// @access  Private
router.get('/', async (req, res) => {
    try {
        const { class: className, subjectId, examType, term } = req.query;

        // Build query
        let query = {};
        if (subjectId) query.subjectId = subjectId;
        if (examType) query.examType = examType;
        if (term) query.term = term;

        // If class filter is applied, we first need to find students in that class
        if (className) {
            const students = await Student.find({ className: className }).select('_id');
            const studentIds = students.map(student => student._id);
            query.studentId = { $in: studentIds };
        }

        const marks = await Mark.find(query)
            .populate('studentId', 'fullName rollNumber className') // populate student details
            .populate('subjectId', 'name code maxMarks') // populate subject details
            .sort({ createdAt: -1 });

        res.json(marks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/marks
// @desc    Add or Update a single mark (Upsert)
// @access  Private
router.post(
    '/',
    [
        check('studentId', 'Student ID is required').not().isEmpty(),
        check('subjectId', 'Subject ID is required').not().isEmpty(),
        check('examType', 'Exam type is required').not().isEmpty(),
        check('marksObtained', 'Marks obtained is required and must be numeric').isNumeric()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { studentId, subjectId, examType, marksObtained, term } = req.body;

        try {
            // Validate max marks
            const subject = await Subject.findById(subjectId);
            if (!subject) {
                return res.status(404).json({ msg: 'Subject not found' });
            }

            if (marksObtained > subject.maxMarks) {
                return res.status(400).json({ msg: `Marks cannot exceed max marks of ${subject.maxMarks}` });
            }
            if (marksObtained < 0) {
                return res.status(400).json({ msg: 'Marks cannot be negative' });
            }

            // Check if mark already exists
            let mark = await Mark.findOne({ studentId, subjectId, examType });

            if (mark) {
                // Update
                mark.marksObtained = marksObtained;
                mark.term = term || mark.term;
                mark.updatedAt = Date.now();
                await mark.save();
                return res.json(mark);
            }

            // Create
            mark = new Mark({
                studentId,
                subjectId,
                examType,
                marksObtained,
                term
            });

            await mark.save();
            res.json(mark);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
);

// @route   POST /api/marks/bulk
// @desc    Bulk Add or Update marks
// @access  Private
router.post('/bulk', async (req, res) => {
    const { marks, subjectId, examType, term } = req.body;
    // marks: Array of { studentId, marksObtained }

    if (!Array.isArray(marks) || !subjectId || !examType) {
        return res.status(400).json({ msg: 'Invalid data format. valid marks array, subjectId, and examType required.' });
    }

    try {
        // Validate max marks once
        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({ msg: 'Subject not found' });
        }

        const operations = marks.map(item => {
            // Basic Validation for each item
            if (item.marksObtained > subject.maxMarks || item.marksObtained < 0) {
                // Skip invalid marks or error? For bulk, maybe filtering invalid ones or failing all?
                // Let's assume frontend validates, but safety check: skip invalid
                return null;
            }

            return {
                updateOne: {
                    filter: {
                        studentId: item.studentId,
                        subjectId: subjectId,
                        examType: examType
                    },
                    update: {
                        $set: {
                            marksObtained: item.marksObtained,
                            term: term || 'Current',
                            updatedAt: new Date()
                        }
                    },
                    upsert: true
                }
            };
        }).filter(op => op !== null); // Remove nulls

        if (operations.length === 0) {
            return res.status(400).json({ msg: 'No valid marks provided.' });
        }

        const result = await Mark.bulkWrite(operations);
        res.json({ msg: 'Bulk update successful', result });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   DELETE /api/marks/:id
// @desc    Delete a mark
// @access  Private
router.delete('/:id', async (req, res) => {
    try {
        await Mark.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Mark removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
