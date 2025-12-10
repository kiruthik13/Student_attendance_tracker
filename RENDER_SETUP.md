# Render Deployment - Environment Variables Setup

## Problem
Login emails work locally but not on Render deployment because environment variables are not configured on Render.

## Required Environment Variables for Render

You need to add these environment variables to your Render backend service:

### Email Configuration
```
EMAIL_USER=kiruthikbairavan13@gmail.com
EMAIL_PASSWORD=ytduxlufdwyfvlcm
```

### Database Configuration
```
MONGODB_URI=your_mongodb_connection_string
```

### JWT Configuration
```
JWT_SECRET=your_jwt_secret_key
```

### Other Configuration
```
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://student-attendance-tracker-gilt.vercel.app
```

## How to Add Environment Variables on Render

### Step 1: Go to Your Render Dashboard
1. Visit https://dashboard.render.com
2. Click on your backend service: **student-attendance-tracker-ycmy**

### Step 2: Navigate to Environment Variables
1. Click on **"Environment"** in the left sidebar
2. Or go to the **"Environment"** tab

### Step 3: Add Environment Variables
For each variable above:
1. Click **"Add Environment Variable"**
2. Enter the **Key** (e.g., `EMAIL_USER`)
3. Enter the **Value** (e.g., `kiruthikbairavan13@gmail.com`)
4. Click **"Save Changes"**

### Step 4: Redeploy
After adding all variables:
1. Click **"Manual Deploy"** → **"Deploy latest commit"**
2. Or Render will automatically redeploy when you save environment variables

## Important Notes

### ⚠️ Security Warning
The email password in your code (`ytduxlufdwyfvlcm`) appears to be a Gmail App Password. This is good! However:

1. **Never commit `.env` files to GitHub** - They contain sensitive credentials
2. **Use different credentials for production** if possible
3. **Rotate your App Password** if it's been exposed in any commits

### 📧 Gmail App Password
If you need to create a new App Password:
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Enter "Render Backend" as the name
4. Click "Generate"
5. Copy the 16-digit password
6. Use this as `EMAIL_PASSWORD` on Render

### 🔍 Verify Environment Variables
After deployment, you can verify if variables are set by:
1. Checking Render logs for "Email configuration check" messages
2. Using the test email endpoint: `POST /api/admin/test-email`

## Environment Variables Checklist

- [ ] EMAIL_USER
- [ ] EMAIL_PASSWORD
- [ ] MONGODB_URI
- [ ] JWT_SECRET
- [ ] NODE_ENV
- [ ] PORT
- [ ] FRONTEND_URL

## Testing After Setup

1. **Check Render Logs**:
   - Go to your Render service → "Logs" tab
   - Look for startup messages showing environment variables are loaded

2. **Test Login**:
   - Try logging in from your deployed frontend
   - Check Render logs for email sending attempts

3. **Test Email Endpoint** (optional):
   ```bash
   curl -X POST https://student-attendance-tracker-ycmy.onrender.com/api/admin/test-email \
     -H "Content-Type: application/json" \
     -d '{"email":"your-email@gmail.com","name":"Test User"}'
   ```

## Common Issues

### Issue 1: "EMAIL_USER not set"
- **Solution**: Add `EMAIL_USER` environment variable on Render

### Issue 2: "Authentication failed"
- **Solution**: Make sure you're using a Gmail App Password, not your regular password

### Issue 3: "Connection timeout"
- **Solution**: Render's servers should not have firewall issues like your local machine
- If it persists, check Render logs for specific error messages

## Quick Setup Commands

If you prefer using Render CLI:
```bash
# Install Render CLI
npm install -g render-cli

# Login
render login

# Set environment variables
render env set EMAIL_USER=kiruthikbairavan13@gmail.com
render env set EMAIL_PASSWORD=ytduxlufdwyfvlcm
render env set NODE_ENV=production
```

## Next Steps

1. ✅ Add all environment variables to Render
2. ✅ Wait for automatic redeployment (or trigger manual deploy)
3. ✅ Test login from deployed frontend
4. ✅ Check Render logs to confirm emails are being sent
5. ✅ Verify you receive the login notification email
