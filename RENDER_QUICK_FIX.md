# Quick Fix: Add Environment Variables to Render

## The Problem
🔴 **Login emails don't work on Render** because your backend deployment is missing the email credentials.

✅ **It works locally** because your local `.env` file has the credentials.

## The Solution (5 Minutes)

### Step 1: Open Render Dashboard
1. Go to: https://dashboard.render.com
2. Find your service: **student-attendance-tracker-ycmy**
3. Click on it

### Step 2: Add Environment Variables
1. Click **"Environment"** in the left menu
2. Click **"Add Environment Variable"** button
3. Add these variables one by one:

```
Key: EMAIL_USER
Value: kiruthikbairavan13@gmail.com
```

```
Key: EMAIL_PASSWORD
Value: ytduxlufdwyfvlcm
```

```
Key: NODE_ENV
Value: production
```

```
Key: FRONTEND_URL
Value: https://student-attendance-tracker-gilt.vercel.app
```

### Step 3: Save and Deploy
1. Click **"Save Changes"**
2. Render will automatically redeploy your service
3. Wait 2-3 minutes for deployment to complete

### Step 4: Test
1. Go to your deployed frontend
2. Try logging in
3. Check your email inbox for the login notification

## Visual Guide

```
Render Dashboard
    ↓
Your Service (student-attendance-tracker-ycmy)
    ↓
Environment Tab
    ↓
Add Environment Variable Button
    ↓
Add: EMAIL_USER = kiruthikbairavan13@gmail.com
Add: EMAIL_PASSWORD = ytduxlufdwyfvlcm
Add: NODE_ENV = production
Add: FRONTEND_URL = https://student-attendance-tracker-gilt.vercel.app
    ↓
Save Changes
    ↓
Wait for Redeploy
    ↓
Test Login → Receive Email ✅
```

## What These Variables Do

| Variable | Purpose |
|----------|---------|
| `EMAIL_USER` | Gmail address to send emails from |
| `EMAIL_PASSWORD` | Gmail App Password for authentication |
| `NODE_ENV` | Tells the app it's in production mode |
| `FRONTEND_URL` | Used in email templates for links |

## Important Notes

⚠️ **Security**: The values I've shown are from your code. In production, you should:
- Use a dedicated email account for the app
- Generate a fresh Gmail App Password
- Never commit `.env` files to GitHub

📧 **Gmail App Password**: The password `ytduxlufdwyfvlcm` is an App Password (16 characters). This is correct! Don't use your regular Gmail password.

## Troubleshooting

### If emails still don't work after adding variables:

1. **Check Render Logs**:
   - Go to your service → "Logs" tab
   - Look for email-related error messages

2. **Verify Variables Are Set**:
   - Go to Environment tab
   - Make sure all 4 variables are listed

3. **Check Deployment Status**:
   - Make sure the deployment completed successfully
   - Look for "Deploy succeeded" message

4. **Test the Backend Directly**:
   ```bash
   # Open your browser and go to:
   https://student-attendance-tracker-ycmy.onrender.com/api/health
   
   # You should see a success response
   ```

## Need Help?

If you're still having issues:
1. Share the Render logs (from the Logs tab)
2. Check if you can access: https://student-attendance-tracker-ycmy.onrender.com
3. Make sure your MongoDB connection is also configured on Render
