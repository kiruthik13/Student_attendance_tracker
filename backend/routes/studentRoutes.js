const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticateToken, restrictTo } = require('../middleware/auth');

// Protect all routes
router.use(authenticateToken);
router.use(restrictTo('student'));

router.get('/dashboard', studentController.getDashboardStats);
router.get('/attendance', studentController.getAttendance);
router.get('/marks', studentController.getMarks);
router.get('/profile', studentController.getProfile);

module.exports = router;