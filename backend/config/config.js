require('dotenv').config();

module.exports = {
  // Server Configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'production',

  // MongoDB Configuration
  mongoUri: 'mongodb+srv://mrbairavan:kiruthik-13@cluster0.fhhvceb.mongodb.net/student-attendance-tracker?retryWrites=true&w=majority',

  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Frontend URL (for CORS)
  frontendUrl: process.env.FRONTEND_URL || 'https://student-attendance-tracker-gilt.vercel.app',
  // API URL (for logs or other use)
  apiUrl: process.env.API_URL || 'https://student-attendance-tracker-4.onrender.com',

  // Email Configuration
  emailUser: process.env.EMAIL_USER || 'kiruthikbairavan13@gmail.com',
  emailPassword: process.env.EMAIL_PASSWORD || 'ytduxlufdwyfvlcm',

  // Security
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
};