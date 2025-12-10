const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const config = require('./config/config');

// Load environment variables
dotenv.config();

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const markRoutes = require('./routes/markRoutes');

// Create Express app
const app = express();

// CORS Configuration - Allow requests from your Vercel frontend
const allowedOrigins = [
  'https://attendance-kiruthik.vercel.app', // New Vercel Deployment
  'https://student-attendance-tracker-w227.onrender.com', // New Render Backend
  'https://student-attendance-tracker-gilt.vercel.app', // Old Main Vercel deployment
  'https://student-attendance-tracker-uvbz.vercel.app',
  'https://student-attendance-tracker-4.onrender.com', // Old Render backend
  'https://student-attendance-tracker-1-n2l2.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://student-attendance-tracker-git-main-kiruthikbairavans-projects.vercel.app',
  'https://student-attendance-tracke-git-d42d1a-kiruthikbairavans-projects.vercel.app'
];

console.log('🚀 Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // In production, check against allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true, // if you're using cookies or sessions
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️  Server will start without database connection');
    console.log('💡 Please check your MongoDB connection string in config/config.js');
  }
};

// Connect to database
connectDB();

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    allowedOrigins,
    requestOrigin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/students', studentRoutes); // This was existing, keeping it or should I use api/student? user asked for /student/...
// User requested /student/attendance etc. I'll map /api/student to studentRoutes.
app.use('/api/student', studentRoutes); // New routes: /dashboard, /attendance, /marks
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/attendance', attendanceRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/marks', markRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Student Attendance Tracker API is running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${config.frontendUrl}`);
  console.log(`🔗 API URL: ${config.apiUrl}`);
  console.log(`🏥 Health check: ${config.apiUrl}/api/health`);
}); 