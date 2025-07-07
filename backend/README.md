# Student Attendance Tracker - Backend

A secure Node.js/Express.js backend API for the Student Attendance Tracker application with MongoDB integration.

## Features

### ✅ Admin Authentication & Authorization
- **Secure Registration**: Password hashing with bcryptjs
- **JWT Authentication**: Secure login with JSON Web Tokens
- **Input Validation**: Express-validator for request validation
- **Protected Routes**: Middleware for route protection
- **Password Security**: Bcrypt hashing with salt rounds

### 🔐 Security Features
- **Environment Variables**: Secure configuration management
- **CORS Protection**: Cross-origin resource sharing configuration
- **Input Sanitization**: Request validation and sanitization
- **Error Handling**: Comprehensive error handling middleware
- **JWT Token Management**: Secure token generation and verification

### 📊 Database Integration
- **MongoDB**: NoSQL database with Mongoose ODM
- **Admin Collection**: Secure storage of admin credentials
- **Data Validation**: Schema-level validation
- **Indexing**: Performance optimization

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **express-validator** - Input validation
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variables

## API Endpoints

### Authentication Routes
- `POST /api/admin/register` - Register new admin
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Logout (client-side token removal)
- `GET /api/admin/verify-token` - Verify token validity

### Protected Routes (Require JWT Token)
- `GET /api/admin/profile` - Get admin profile
- `PUT /api/admin/profile` - Update admin profile
- `PUT /api/admin/change-password` - Change password

### Utility Routes
- `GET /api/health` - Health check endpoint

## Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment variables:
Create a `.env` file in the backend directory with the following variables:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/student-attendance-tracker
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FRONTEND_URL=http://localhost:5173
BCRYPT_SALT_ROUNDS=12
JWT_EXPIRES_IN=7d
```

4. Start the development server:
```bash
npm run dev
```

5. The API will be available at `http://localhost:5000`

## Project Structure

```
backend/
├── config/
│   └── config.js              # Configuration settings
├── middleware/
│   ├── auth.js                # JWT authentication middleware
│   └── validation.js          # Input validation middleware
├── models/
│   └── Admin.js               # Admin model with password hashing
├── routes/
│   └── adminRoutes.js         # Admin authentication routes
├── server.js                  # Main server file
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## API Documentation

### Register Admin
```http
POST /api/admin/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "message": "Admin registered successfully",
  "token": "jwt_token_here",
  "admin": {
    "_id": "admin_id",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Login Admin
```http
POST /api/admin/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "admin": {
    "_id": "admin_id",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "isActive": true,
    "lastLogin": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get Profile (Protected)
```http
GET /api/admin/profile
Authorization: Bearer jwt_token_here
```

### Update Profile (Protected)
```http
PUT /api/admin/profile
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "fullName": "John Smith",
  "email": "johnsmith@example.com"
}
```

### Change Password (Protected)
```http
PUT /api/admin/change-password
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "currentPassword": "SecurePass123",
  "newPassword": "NewSecurePass456"
}
```

## Security Features

### Password Security
- Passwords are hashed using bcryptjs with 12 salt rounds
- Password validation requires uppercase, lowercase, and number
- Minimum 6 characters required

### JWT Authentication
- Tokens expire after 7 days
- Secure token generation and verification
- Token-based route protection

### Input Validation
- Email format validation
- Password strength requirements
- Name format validation (letters and spaces only)
- Request sanitization

### Error Handling
- Comprehensive error messages
- Proper HTTP status codes
- Security-conscious error responses

## Database Schema

### Admin Collection
```javascript
{
  _id: ObjectId,
  fullName: String (required, 2-50 chars),
  email: String (required, unique, lowercase),
  password: String (required, hashed),
  role: String (enum: ['admin', 'super_admin']),
  isActive: Boolean (default: true),
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (to be implemented)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/student-attendance-tracker |
| `JWT_SECRET` | JWT signing secret | your-super-secret-jwt-key-change-this-in-production |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | 12 |
| `JWT_EXPIRES_IN` | JWT token expiration | 7d |

## Development Notes

- The backend uses MongoDB as the database
- JWT tokens are used for authentication
- Passwords are securely hashed with bcryptjs
- Input validation is implemented using express-validator
- CORS is configured to allow frontend requests
- Error handling is comprehensive and secure

## Next Steps

1. **Student Management**: Add student CRUD operations
2. **Attendance Tracking**: Implement attendance marking system
3. **Reports**: Add attendance reports and analytics
4. **Testing**: Add unit and integration tests
5. **Logging**: Implement comprehensive logging
6. **Rate Limiting**: Add rate limiting for security
7. **File Upload**: Add profile picture upload functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License. 