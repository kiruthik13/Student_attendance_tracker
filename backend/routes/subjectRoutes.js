const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const { check, validationResult } = require('express-validator');

// @route   GET /api/subjects
// @desc    Get all subjects
// @access  Public (or Protected based on middleware)
router.get('/', async (req, res) => {
    try {
        const subjects = await Subject.find().sort({ name: 1 });
        res.json(subjects);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/subjects
// @desc    Create a new subject
// @access  Private (Admin)
router.post(
    '/',
    [
        check('name', 'Subject name is required').not().isEmpty(),
        check('code', 'Subject code is required').not().isEmpty(),
        check('maxMarks', 'Max marks must be a number').optional().isNumeric()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, code, maxMarks } = req.body;

        try {
            let subject = await Subject.findOne({ code });

            if (subject) {
                return res.status(400).json({ msg: 'Subject with this code already exists' });
            }

            subject = new Subject({
                name,
                code,
                maxMarks: maxMarks || 100
            });

            await subject.save();
            res.json(subject);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
);

// @route   PUT /api/subjects/:id
// @desc    Update a subject
// @access  Private (Admin)
router.put('/:id', async (req, res) => {
    const { name, code, maxMarks } = req.body;

    // Build subject object
    const subjectFields = {};
    if (name) subjectFields.name = name;
    if (code) subjectFields.code = code;
    if (maxMarks) subjectFields.maxMarks = maxMarks;
    subjectFields.updatedAt = Date.now();

    try {
        let subject = await Subject.findById(req.params.id);

        if (!subject) return res.status(404).json({ msg: 'Subject not found' });

        subject = await Subject.findByIdAndUpdate(
            req.params.id,
            { $set: subjectFields },
            { new: true }
        );

        res.json(subject);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/subjects/:id
// @desc    Delete a subject
// @access  Private (Admin)
router.delete('/:id', async (req, res) => {
    try {
        console.log('Attempting to delete subject with ID:', req.params.id);

        // In Mongoose 6+, remove() is deprecated on documents, use deleteOne() on model or findByIdAndDelete
        // Or if you have the document, doc.deleteOne()

        const subject = await Subject.findById(req.params.id);

        if (!subject) {
            console.log('Subject not found');
            return res.status(404).json({ msg: 'Subject not found' });
        }

        // Checking if there are marks associated with this subject could be a good safety check here
        // But for now, we'll allow deletion

        await Subject.findByIdAndDelete(req.params.id);
        console.log('Subject deleted successfully');

        res.json({ msg: 'Subject removed' });
    } catch (err) {
        console.error('Error deleting subject:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Subject not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
