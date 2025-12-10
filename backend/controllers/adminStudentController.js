const Student = require('../models/Student');
const User = require('../models/User');

// Create a new student and user account
exports.createStudent = async (req, res) => {
    try {
        const {
            fullName,
            email,
            rollNumber,
            className,
            section,
            phoneNumber,
            parentName,
            parentPhone,
            address,
            password
        } = req.body;

        // Check if student already exists
        const existingStudent = await Student.findOne({
            $or: [{ email: email.toLowerCase() }, { rollNumber }]
        });

        if (existingStudent) {
            return res.status(400).json({
                message: existingStudent.email === email.toLowerCase()
                    ? 'Student with this email already exists'
                    : 'Student with this roll number already exists'
            });
        }

        // Create Student Profile
        const student = new Student({
            fullName,
            email,
            rollNumber,
            className,
            section,
            phoneNumber,
            parentName,
            parentPhone,
            address
        });

        const savedStudent = await student.save();

        // Check if User account exists, if not create one
        let user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            user = new User({
                fullName,
                email,
                password: password || 'student123', // Default password if not provided
                role: 'student',
                isActive: true
            });
            await user.save();
        }

        res.status(201).json({
            message: 'Student created successfully',
            student: savedStudent
        });

    } catch (error) {
        console.error('Create student error:', error);
        res.status(500).json({
            message: 'Failed to create student',
            error: error.message
        });
    }
};

// Get all students with filtering
exports.getAllStudents = async (req, res) => {
    try {
        const { class: className, section, search } = req.query;
        let query = {};

        if (className) query.className = className;
        if (section) query.section = section;
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { rollNumber: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const students = await Student.find(query).sort({ createdAt: -1 });
        res.json({ students });

    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ message: 'Failed to fetch students' });
    }
};

// Get single student by ID
exports.getStudentById = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json({ student });
    } catch (error) {
        console.error('Get student error:', error);
        res.status(500).json({ message: 'Failed to fetch student profile' });
    }
};

// Update student
exports.updateStudent = async (req, res) => {
    try {
        const {
            fullName,
            email,
            className,
            section,
            phoneNumber,
            parentName,
            parentPhone,
            address
        } = req.body;

        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // If email is changing, check uniqueness and update User
        if (email && email.toLowerCase() !== student.email) {
            const existingStudent = await Student.findOne({
                email: email.toLowerCase(),
                _id: { $ne: student._id }
            });
            if (existingStudent) {
                return res.status(400).json({ message: 'Email already in use' });
            }

            // Find linked User and update email
            const user = await User.findOne({ email: student.email });
            if (user) {
                user.email = email.toLowerCase();
                await user.save();
            }
        }

        // Update fields
        if (fullName) student.fullName = fullName;
        if (email) student.email = email.toLowerCase();
        if (className) student.className = className;
        if (section) student.section = section;
        if (phoneNumber) student.phoneNumber = phoneNumber;
        if (parentName) student.parentName = parentName;
        if (parentPhone) student.parentPhone = parentPhone;
        if (address) student.address = address;

        const updatedStudent = await student.save();

        // Sync name with User if exists
        const user = await User.findOne({ email: updatedStudent.email });
        if (user && fullName) {
            user.fullName = fullName;
            await user.save();
        }

        res.json({
            message: 'Student updated successfully',
            student: updatedStudent
        });

    } catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({ message: 'Failed to update student' });
    }
};

// Delete student
exports.deleteStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Delete linked User account
        await User.findOneAndDelete({ email: student.email });

        // Delete student profile
        await Student.findByIdAndDelete(req.params.id);

        res.json({ message: 'Student and linked account deleted successfully' });

    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({ message: 'Failed to delete student' });
    }
};

// Get list of all distinct classes
exports.getClasses = async (req, res) => {
    try {
        const classes = await Student.distinct('className');
        res.status(200).json({ classes: classes.sort() });
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ message: 'Error fetching classes', error: error.message });
    }
};

// Get list of all distinct sections
exports.getSections = async (req, res) => {
    try {
        const sections = await Student.distinct('section');
        res.status(200).json({ sections: sections.sort() });
    } catch (error) {
        console.error('Get sections error:', error);
        res.status(500).json({ message: 'Error fetching sections', error: error.message });
    }
};

