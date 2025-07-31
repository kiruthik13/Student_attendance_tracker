# Email Setup Guide for Student Attendance Tracker

## Overview
The application sends welcome emails when users register and password reset emails when requested. This guide will help you set up Gmail SMTP for sending emails.

## Prerequisites
- Gmail account
- 2-Factor Authentication enabled on your Gmail account
- App Password generated for the application

## Step 1: Enable 2-Factor Authentication on Gmail

1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to "Security"
3. Enable "2-Step Verification" if not already enabled
4. This is required to generate an App Password

## Step 2: Generate Gmail App Password

1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to "Security" → "2-Step Verification"
3. Scroll down and click "App passwords"
4. Select "Mail" as the app and "Other" as the device
5. Enter a name like "Student Attendance Tracker"
6. Click "Generate"
7. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

## Step 3: Create Environment File

Create a `.env` file in the `backend` directory with the following content:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/student_attendance_tracker

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# Email Configuration (Gmail)
EMAIL_USER=your-gmail-address@gmail.com
EMAIL_PASSWORD=your-16-character-app-password

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

**Important Notes:**
- Replace `your-gmail-address@gmail.com` with your actual Gmail address
- Replace `your-16-character-app-password` with the App Password you generated
- Remove spaces from the App Password if any
- Keep this file secure and never commit it to version control

## Step 4: Test Email Configuration

### Option 1: Using the Test Endpoint

1. Start your server: `cd backend && node server.js`
2. Use Postman or curl to test the email endpoint:

```bash
curl -X POST http://localhost:5000/api/admin/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User"
  }'
```

### Option 2: Register a New User

1. Go to your application's registration page
2. Register a new admin user
3. Check the email inbox for the welcome email

## Step 5: Verify Email Functionality

### Welcome Email Features:
- ✅ College branding with logo and colors
- ✅ Personalized greeting with user's name
- ✅ Account details (name, email, status)
- ✅ System features list
- ✅ Direct link to dashboard
- ✅ Professional styling

### Password Reset Email Features:
- ✅ College branding
- ✅ Secure reset link with token
- ✅ 1-hour expiration notice
- ✅ Professional styling

## Troubleshooting

### Common Issues:

1. **"Invalid login" error**
   - Ensure 2-Factor Authentication is enabled
   - Generate a new App Password
   - Check that the password has no spaces

2. **"Authentication failed" error**
   - Verify your Gmail address is correct
   - Ensure the App Password is correct
   - Check that 2-Factor Authentication is enabled

3. **"Connection timeout" error**
   - Check your internet connection
   - Verify Gmail SMTP settings
   - Try again in a few minutes

4. **Emails not sending**
   - Check server console for error messages
   - Verify environment variables are set correctly
   - Test with the test endpoint first

### Debug Steps:

1. Check server logs for email-related errors
2. Verify `.env` file exists and has correct values
3. Test email configuration with the test endpoint
4. Check Gmail account settings and App Password

## Security Notes

- ✅ Never commit `.env` file to version control
- ✅ Use App Passwords, not your main Gmail password
- ✅ Regularly rotate App Passwords
- ✅ Monitor email sending logs
- ✅ Use environment-specific configurations

## Production Deployment

For production deployment:

1. Use a dedicated email service (SendGrid, Mailgun, etc.)
2. Set up proper DNS records (SPF, DKIM, DMARC)
3. Monitor email delivery rates
4. Implement email templates for different scenarios
5. Add email queue system for high volume

## Email Templates

The application includes two email templates:

1. **Welcome Email** (`welcomeEmail`): Sent when users register
2. **Password Reset Email** (`passwordResetEmail`): Sent when password reset is requested

Both templates include:
- College branding and colors
- Professional HTML formatting
- Responsive design
- Clear call-to-action buttons

## Support

If you encounter issues:

1. Check the server console for detailed error messages
2. Verify your Gmail account settings
3. Test with the provided test endpoint
4. Review this guide for common solutions

---

**Last Updated:** July 31, 2024
**Version:** 2.0 