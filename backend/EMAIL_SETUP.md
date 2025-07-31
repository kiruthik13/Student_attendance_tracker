# Email Setup Guide

This guide will help you set up email functionality for the Attendance Management System.

## Prerequisites

1. A Gmail account
2. Gmail App Password (not your regular password)

## Step 1: Enable 2-Factor Authentication

1. Go to your Google Account settings
2. Navigate to Security
3. Enable 2-Step Verification if not already enabled

## Step 2: Generate App Password

1. Go to your Google Account settings
2. Navigate to Security
3. Under "2-Step Verification", click on "App passwords"
4. Select "Mail" and "Other (Custom name)"
5. Enter a name like "Attendance System"
6. Click "Generate"
7. Copy the 16-character password (you'll only see it once)

## Step 3: Configure Environment Variables

Add these variables to your `.env` file:

```env
# Email Configuration
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASSWORD=your_16_character_app_password
FRONTEND_URL=http://localhost:5173
```

## Step 4: Install Dependencies

Run this command in the backend directory:

```bash
npm install nodemailer
```

## Step 5: Test Email Functionality

1. Start your backend server
2. Register a new admin account
3. Check the email inbox for the welcome email

## Email Templates

The system includes two email templates:

### 1. Welcome Email
- Sent when a new admin registers
- Contains account details and login instructions
- Features Kongu Engineering College branding

### 2. Password Reset Email
- Sent when password reset is requested
- Contains secure reset link
- Expires after 1 hour

## Troubleshooting

### Common Issues:

1. **"Invalid login" error**
   - Make sure you're using an App Password, not your regular Gmail password
   - Ensure 2-Factor Authentication is enabled

2. **"Authentication failed" error**
   - Check that your Gmail address and App Password are correct
   - Verify that the App Password was generated for "Mail"

3. **Emails not sending**
   - Check your internet connection
   - Verify that the EMAIL_USER and EMAIL_PASSWORD are set correctly
   - Check the server logs for detailed error messages

### Security Notes:

- Never commit your `.env` file to version control
- Keep your App Password secure
- Consider using environment-specific email accounts for production

## Production Deployment

For production deployment:

1. Use a dedicated email service (SendGrid, Mailgun, etc.)
2. Update the email configuration in `config/email.js`
3. Set up proper DNS records for email deliverability
4. Monitor email sending logs and bounce rates

## Support

If you encounter issues:

1. Check the server console for error messages
2. Verify your Gmail settings
3. Test with a different Gmail account
4. Check the email service logs 