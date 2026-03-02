# Deploy to Cloud - After GitHub Push

**Prerequisites**: Your code must be on GitHub first! See `GITHUB-PUSH-GUIDE.md`

---

## Overview

We'll deploy:
- **Backend** → Render (FREE, auto-deploys from GitHub)
- **Frontend** → Netlify (FREE, drag & drop)
- **Keep-Alive** → UptimeRobot (FREE, prevents backend sleep)

Total cost: **$0**

---

## Part 1: Deploy Backend to Render (5 minutes)

### 1.1 Create Render Account

1. Go to: https://render.com
2. Click "Get Started for Free"
3. **Click "Sign up with GitHub"** (easiest way!)
4. Authorize Render to access your repositories
5. Done!

### 1.2 Create Web Service

1. **Go to Dashboard**: https://dashboard.render.com
2. **Click**: "New +" button (top right)
3. **Select**: "Web Service"

### 1.3 Connect Your Repository

1. You'll see a list of your GitHub repositories
2. **Find**: `vehicle-pos-pwa`
3. **Click**: "Connect"

**Don't see your repo?**
- Click "Configure account" → Select your GitHub account
- Grant access to the repository
- Go back and try again

### 1.4 Configure the Service

Fill in these settings:

```
Name: vehicle-pos-backend
Region: Oregon (US West) - or closest to you
Branch: main
Root Directory: (leave empty)
Runtime: Node
Build Command: npm install
Start Command: node mock-backend/server.js
Instance Type: Free
```

**Environment Variables** (optional but recommended):
- Click "Advanced"
- Click "Add Environment Variable"
- Key: `PORT`
- Value: `3000`

### 1.5 Deploy!

1. **Click**: "Create Web Service" (bottom of page)
2. **Wait**: 2-3 minutes while it deploys
3. **Watch the logs** - you'll see:
   - Installing dependencies...
   - Starting server...
   - "JSON Server is running on http://localhost:3000"

### 1.6 Get Your Backend URL

Once deployed, you'll see:
```
https://vehicle-pos-backend-XXXX.onrender.com
```

**Copy this URL!** You'll need it for the frontend.

### 1.7 Test Your Backend

Open in browser:
```
https://vehicle-pos-backend-XXXX.onrender.com/api/vehicle-data/catalog
```

You should see JSON data! ✅

---

## Part 2: Update Frontend Configuration (2 minutes)

### 2.1 Update Environment File

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'https://vehicle-pos-backend-XXXX.onrender.com/api'  // ← Your Render URL
};
```

**Replace** `XXXX` with your actual Render URL!

### 2.2 Build Frontend

```bash
npm run build
```

This creates: `dist/vehicle-pos-pwa/browser/`

---

## Part 3: Deploy Frontend to Netlify (3 minutes)

### 3.1 Create Netlify Account

1. Go to: https://app.netlify.com
2. Sign up with GitHub or email (your choice)
3. Done!

### 3.2 Deploy Site

1. **Go to**: https://app.netlify.com/drop
2. **Drag and drop** the `dist/vehicle-pos-pwa/browser/` folder
3. **Wait**: 30 seconds
4. **Done!** You'll get a URL like: `https://random-name-12345.netlify.app`

### 3.3 Customize Your URL (optional)

1. Click "Site settings"
2. Click "Change site name"
3. Enter: `your-vehicle-pos` (or any available name)
4. Your new URL: `https://your-vehicle-pos.netlify.app`

---

## Part 4: Update CORS in Backend (IMPORTANT!)

Your frontend needs permission to call your backend.

### 4.1 Update server.js

Edit `mock-backend/server.js` - find the CORS section (around line 5-10) and add your Netlify URL:

```javascript
const cors = require('cors');

server.use(cors({
  origin: [
    'http://localhost:4200',
    'http://localhost:8080',
    'https://your-vehicle-pos.netlify.app'  // ← Add your Netlify URL here
  ],
  credentials: true
}));
```

**Note**: If you don't see a CORS section, add this after `server.use(middlewares);`:

```javascript
const cors = require('cors');
server.use(cors({
  origin: [
    'http://localhost:4200',
    'http://localhost:8080',
    'https://your-vehicle-pos.netlify.app'
  ],
  credentials: true
}));
```

### 4.2 Push Update to GitHub

```bash
git add .
git commit -m "Update CORS for production"
git push
```

### 4.3 Wait for Auto-Deploy

- Render will automatically detect the push
- It will rebuild and redeploy (takes 2 minutes)
- Watch the logs in Render dashboard

---

## Part 5: Set Up Keep-Alive (2 minutes)

Render free tier spins down after 15 minutes. Keep it awake!

### 5.1 Create UptimeRobot Account

1. Go to: https://uptimerobot.com
2. Sign up (free)
3. Verify email

### 5.2 Add Monitor

1. Click "Add New Monitor"
2. Fill in:
   ```
   Monitor Type: HTTP(s)
   Friendly Name: Vehicle POS Backend
   URL: https://vehicle-pos-backend-XXXX.onrender.com/api/vehicle-data/catalog
   Monitoring Interval: 5 minutes
   ```
3. Click "Create Monitor"

**Done!** Your backend will stay awake 24/7.

---

## Part 6: Test Your Deployed App

### 6.1 Open Your App

Go to: `https://your-vehicle-pos.netlify.app`

### 6.2 Test Login

Use test credentials:
- Employee ID: `EMP001`
- Password: `SecurePass123!`

### 6.3 Test Offline Mode

1. Login and set a PIN
2. Open browser DevTools (F12)
3. Go to "Network" tab
4. Check "Offline" checkbox
5. Logout and login with PIN
6. Should work! ✅

---

## Your Deployed Application

```
Frontend:  https://your-vehicle-pos.netlify.app
Backend:   https://vehicle-pos-backend-XXXX.onrender.com

Test Credentials:
- EMP001 / SecurePass123!
- EMP002 / Manager@2024

Cost: $0 (completely free!)
```

---

## Future Updates

### Update Backend

```bash
# Make changes to backend code
git add .
git commit -m "Update backend"
git push
```

Render auto-deploys in 2 minutes! ✅

### Update Frontend

```bash
# Make changes to frontend code
npm run build
# Drag & drop browser folder to Netlify
```

Or set up Netlify to auto-deploy from GitHub too!

---

## Troubleshooting

### Backend Shows "Application failed to respond"

**Wait**: First deployment takes 2-3 minutes

**Check Render Logs**:
1. Go to Render dashboard
2. Click your service
3. Click "Logs" tab
4. Look for "JSON Server is running"

### Frontend Can't Connect to Backend

**Check CORS**:
1. Open browser DevTools (F12)
2. Go to "Console" tab
3. Look for CORS errors
4. Make sure you added Netlify URL to CORS in server.js
5. Make sure you pushed the update to GitHub
6. Make sure Render redeployed (check logs)

### Backend Spins Down After 15 Minutes

**Check UptimeRobot**:
1. Go to UptimeRobot dashboard
2. Make sure monitor is "Up"
3. Check that it's pinging every 5 minutes

### "Failed to fetch" Errors

**First Request After Spin-Down**:
- Takes 20-30 seconds to wake up
- This is normal for Render free tier
- Your PWA handles this gracefully
- PIN login works immediately (offline-first!)

---

## Testing Offline Mode in Production

### Method 1: Browser DevTools

1. Open DevTools (F12)
2. Go to "Network" tab
3. Check "Offline" checkbox
4. Test PIN login

### Method 2: Airplane Mode

1. Login and set PIN
2. Enable airplane mode on your device
3. Refresh the page
4. Login with PIN
5. Should work! ✅

---

## Accessing from USA

Your app is now accessible from anywhere in the world, including USA!

Just share the URL: `https://your-vehicle-pos.netlify.app`

Anyone can:
- Access the app from any device
- Login with credentials
- Set up their PIN
- Use offline mode
- All features work!

---

## Summary

✅ Backend deployed to Render (auto-deploys from GitHub)
✅ Frontend deployed to Netlify (drag & drop)
✅ CORS configured for production
✅ Keep-alive set up (backend stays awake)
✅ Accessible from anywhere including USA
✅ Offline mode works
✅ Total cost: $0

🎉 Your app is live!
