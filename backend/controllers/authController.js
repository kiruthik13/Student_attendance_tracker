const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Generate Token
const generateToken = (userId, role) => {
    return jwt.sign({ id: userId, role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
};

// Register User
exports.register = async (req, res) => {
    try {
        const { fullName, email, password, role } = req.body;

        // Validation
        if (!role || !['admin', 'student'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role selected' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user
        const user = new User({
            fullName,
            email,
            password,
            role
        });

        await user.save();

        // Generate Token
        const token = generateToken(user._id, user.role);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// Login User
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check isActive
        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is deactivated' });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate token
        const token = generateToken(user._id, user.role);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};
