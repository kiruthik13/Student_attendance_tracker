# Email Timeout Troubleshooting Guide

## Problem
Login notification emails are timing out after 60 seconds when trying to connect to Gmail's SMTP server.

## Root Causes
The timeout issue is typically caused by one or more of the following:

### 1. **Firewall/Antivirus Blocking SMTP Ports**
   - Windows Firewall or antivirus software may be blocking outgoing connections on ports 587 and 465
   - Corporate/School networks often block SMTP ports

### 2. **Gmail Security Settings**
   - Gmail may be blocking "less secure apps"
   - Two-Factor Authentication (2FA) requires App Passwords instead of regular passwords

### 3. **Network/ISP Restrictions**
   - Some ISPs block SMTP ports to prevent spam
   - VPN or proxy settings may interfere

## Solutions

### Solution 1: Use Gmail App Password (RECOMMENDED)
If you have 2FA enabled on your Gmail account:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Generate a new App Password for "Mail"
5. Update your `.env` file with the App Password:
   ```
   EMAIL_PASSWORD=your-16-digit-app-password
   ```

### Solution 2: Enable Less Secure Apps (Not Recommended)
If you don't have 2FA:

1. Go to [Less Secure Apps](https://myaccount.google.com/lesssecureapps)
2. Turn ON "Allow less secure apps"
3. Note: Google is phasing this out, so use App Passwords instead

### Solution 3: Check Firewall Settings

#### Windows Firewall:
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Outbound Rules"
4. Create a new rule to allow Node.js to access ports 587 and 465

#### Antivirus:
- Temporarily disable your antivirus to test if it's blocking the connection
- If emails work with antivirus disabled, add an exception for Node.js

### Solution 4: Test SMTP Connection
Run this command to test if you can connect to Gmail's SMTP server:

```powershell
Test-NetConnection -ComputerName smtp.gmail.com -Port 587
```

If this fails, your network is blocking the connection.

### Solution 5: Use Alternative Email Service
If Gmail continues to have issues, consider using:
- **SendGrid** (free tier: 100 emails/day)
- **Mailgun** (free tier: 5,000 emails/month)
- **AWS SES** (very cheap, pay-as-you-go)

## Quick Fix: Disable Login Emails Temporarily
If you need the system to work immediately, you can disable login notification emails:

1. Open `backend/routes/adminRoutes.js`
2. Find the login route
3. Comment out or remove the email sending code

## What I've Already Fixed
- ✅ Increased connection timeouts from 20 to 60 seconds
- ✅ Added retry mechanism for both ports 587 and 465
- ✅ Improved error logging

## Next Steps
1. **First, try Solution 1** (App Password) - this fixes 90% of cases
2. If that doesn't work, test your SMTP connection (Solution 4)
3. Check your firewall settings (Solution 3)
4. As a last resort, consider an alternative email service (Solution 5)

## Testing
After making changes:
1. Restart your backend server
2. Try logging in again
3. Check the terminal for detailed error messages
4. The logs will show which port failed and why
