require('dotenv').config();

module.exports = {
  // Server Configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB Configuration
  mongoUri: 'mongodb+srv://mrbairavan:kiruthik13@cluster0.fhhvceb.mongodb.net/student-attendance-tracker',
  
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Frontend URL (for CORS)
  frontendUrl: process.env.FRONTEND_URL || 'https://student-attendance-tracker-gilt.vercel.app',
  // API URL (for logs or other use)
  apiUrl: process.env.API_URL || 'https://student-attendance-tracker-1-n2l2.onrender.com',
  
  // Security
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
}; 