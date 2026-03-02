# Deploy to Netlify + Render - Step by Step Guide

## Quick Overview
- **Frontend**: Netlify (drag & drop, 2 minutes)
- **Backend**: Render (connect GitHub, 3 minutes)
- **Total Time**: 5-10 minutes
- **Cost**: $0

---

## STEP 1: Deploy Backend to Render (Do This First!)

### 1.1 Create Render Account
1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub (recommended) or email
4. Verify your email

### 1.2 Prepare Backend Files

First, let's create the necessary configuration files:

**Create `render.yaml`** (already exists, but let's verify):
```yaml
services:
  - type: web
    name: vehicle-pos-backend
    env: node
    buildCommand: cd mock-backend && npm install
    startCommand: node mock-backend/server.js
    envVars:
      - key: PORT
        value: 3000
      - key: NODE_ENV
        value: production
```

### 1.3 Push Code to GitHub (If Not Already)

```bash
# Initialize git if needed
git init
git add .
git commit -m "Ready for deployment"

# Create GitHub repo and push
# Go to github.com → New repository → vehicle-pos-pwa
git remote add origin https://github.com/YOUR_USERNAME/vehicle-pos-pwa.git
git branch -M main
git push -u origin main
```

### 1.4 Deploy on Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +"** → Select "Web Service"
3. **Connect Repository**:
   - Click "Connect account" (if first time)
   - Select your GitHub repository: `vehicle-pos-pwa`
   - Click "Connect"

4. **Configure Service**:
   ```
   Name: vehicle-pos-backend
   Region: Oregon (US West) or closest to you
   Branch: main
   Root Directory: (leave empty)
   Runtime: Node
   Build Command: cd mock-backend && npm install
   Start Command: node mock-backend/server.js
   Instance Type: Free
   ```

5. **Add Environment Variables** (optional):
   - Click "Advanced"
   - Add: `PORT` = `3000`
   - Add: `NODE_ENV` = `production`

6. **Click "Create Web Service"**

7. **Wait for Deployment** (2-3 minutes):
   - Watch the logs
   - Wait for "Your service is live 🎉"
   - Copy your backend URL: `https://vehicle-pos-backend-XXXX.onrender.com`

### 1.5 Test Backend

Open in browser:
```
https://vehicle-pos-backend-XXXX.onrender.com/api/health
```

Should see: `{"status":"ok"}`

---

## STEP 2: Update Frontend with Backend URL

### 2.1 Update Environment File

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'https://vehicle-pos-backend-XXXX.onrender.com'  // ← Your Render URL
};
```

Replace `XXXX` with your actual Render URL!

### 2.2 Build Production Version

```bash
cd vehicle-pos-pwa
npm run build
```

Wait for build to complete. Output will be in `dist/vehicle-pos-pwa/browser/`

---

## STEP 3: Deploy Frontend to Netlify

### 3.1 Create Netlify Account

1. Go to https://app.netlify.com
2. Click "Sign up"
3. Sign up with GitHub (recommended) or email

### 3.2 Deploy via Drag & Drop (Easiest!)

1. **Go to Netlify Dashboard**: https://app.netlify.com
2. **Scroll down** to "Want to deploy a new site without connecting to Git?"
3. **Drag and drop** the folder:
   ```
   dist/vehicle-pos-pwa/browser/
   ```
   (Drag the entire `browser` folder into the box)

4. **Wait for deployment** (30 seconds):
   - Netlify will upload and deploy
   - You'll get a random URL like: `https://random-name-123456.netlify.app`

5. **Rename your site** (optional):
   - Click "Site settings"
   - Click "Change site name"
   - Enter: `vehicle-pos-pwa` (or any available name)
   - Your URL becomes: `https://vehicle-pos-pwa.netlify.app`

### 3.3 Configure Netlify for PWA

1. **Go to Site Settings** → "Build & deploy" → "Post processing"
2. **Enable "Pretty URLs"** (removes .html extensions)
3. **Add Redirects**:
   - Go to "Deploys" → "Deploy settings"
   - Scroll to "Redirects and rewrites"
   - Click "Edit rules"
   - Add this file to your project root as `netlify.toml`:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/ngsw-worker.js"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/manifest.webmanifest"
  [headers.values]
    Content-Type = "application/manifest+json"
```

4. **Redeploy** with the new config:
   - Drag and drop the `browser` folder again

---

## STEP 4: Test Your Deployed App!

### 4.1 Open Your App

Visit: `https://your-site-name.netlify.app`

### 4.2 Test Online Login

1. Click login
2. Enter:
   - Employee ID: `EMP001`
   - Password: `SecurePass123!`
3. Should login successfully
4. Set PIN: `1234`
5. Logout

### 4.3 Test Offline Login

1. Open DevTools (F12)
2. Go to Network tab
3. Change dropdown to "Offline"
4. Try to login:
   - Employee ID: `EMP001`
   - PIN: `1234`
5. Should login successfully! ✅

### 4.4 Test on Mobile

1. Open on your phone: `https://your-site-name.netlify.app`
2. Login and set PIN
3. Enable Airplane Mode
4. Close and reopen browser
5. App should still work!
6. Login with PIN should work!

---

## STEP 5: Set Up Keep-Alive (Prevent Backend Sleep)

### Option A: UptimeRobot (Recommended - Free)

1. Go to https://uptimerobot.com
2. Sign up (free account)
3. Click "Add New Monitor"
4. Configure:
   ```
   Monitor Type: HTTP(s)
   Friendly Name: Vehicle POS Backend
   URL: https://vehicle-pos-backend-XXXX.onrender.com/api/health
   Monitoring Interval: 5 minutes
   ```
5. Click "Create Monitor"

Now your backend will never sleep! 🎉

### Option B: Cron-Job.org (Alternative - Free)

1. Go to https://cron-job.org
2. Sign up (free account)
3. Create new cron job:
   ```
   Title: Keep Backend Awake
   URL: https://vehicle-pos-backend-XXXX.onrender.com/api/health
   Schedule: Every 10 minutes
   ```
4. Save

---

## Your Deployed URLs

After deployment, you'll have:

```
Frontend: https://your-site-name.netlify.app
Backend:  https://vehicle-pos-backend-XXXX.onrender.com

Test Credentials:
- EMP001 / SecurePass123!
- EMP002 / Manager@2024
```

---

## Troubleshooting

### Backend Not Working

**Check Render Logs:**
1. Go to Render dashboard
2. Click your service
3. Click "Logs" tab
4. Look for errors

**Common Issues:**
- Port not set correctly (should be 3000)
- npm install failed (check package.json exists in mock-backend/)
- CORS errors (check server.js has correct CORS config)

### Frontend Not Loading

**Check Netlify Deploy Log:**
1. Go to Netlify dashboard
2. Click "Deploys"
3. Click latest deploy
4. Check for errors

**Common Issues:**
- Wrong folder uploaded (should be `browser` folder, not `dist`)
- Service worker not registering (check ngsw-worker.js exists)
- API URL not updated (check environment.ts)

### CORS Errors

If you see CORS errors in browser console:

1. **Update backend CORS** in `mock-backend/server.js`:
```javascript
app.use(cors({
  origin: [
    'http://localhost:4200',
    'http://localhost:8080',
    'https://your-site-name.netlify.app'  // ← Add your Netlify URL
  ],
  credentials: true
}));
```

2. **Commit and push** to GitHub
3. **Render will auto-redeploy**

### Service Worker Not Working

1. **Check HTTPS**: Service workers require HTTPS (Netlify provides this automatically)
2. **Hard refresh**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. **Check registration**:
   - Open DevTools → Application tab
   - Look for "Service Workers" section
   - Should show "activated and running"

---

## Update Deployment

### Update Backend

1. Make changes to code
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Update backend"
   git push
   ```
3. Render auto-deploys (2-3 minutes)

### Update Frontend

1. Make changes to code
2. Update environment.ts if needed
3. Build:
   ```bash
   npm run build
   ```
4. Drag and drop `dist/vehicle-pos-pwa/browser/` to Netlify again
5. Done! (30 seconds)

---

## Custom Domain (Optional)

### Add Your Own Domain

**On Netlify:**
1. Go to "Domain settings"
2. Click "Add custom domain"
3. Enter your domain: `pos.yourdomain.com`
4. Follow DNS instructions
5. Netlify provides free SSL certificate

**On Render:**
1. Go to service settings
2. Click "Custom Domain"
3. Enter: `api.yourdomain.com`
4. Follow DNS instructions
5. Render provides free SSL certificate

---

## Monitoring & Analytics

### Netlify Analytics (Optional - $9/month)

- Real-time visitor stats
- Bandwidth usage
- Top pages

### Render Metrics (Free)

- CPU usage
- Memory usage
- Response times
- Request count

---

## Cost Summary

```
Netlify (Frontend):
├─ Bandwidth: 100 GB/month
├─ Build minutes: 300/month
└─ Cost: $0

Render (Backend):
├─ Hours: 750/month (24/7 coverage)
├─ RAM: 512 MB
├─ Bandwidth: 100 GB/month
└─ Cost: $0

UptimeRobot (Keep-Alive):
├─ Monitors: 50
├─ Checks: Every 5 minutes
└─ Cost: $0

TOTAL: $0/month
```

---

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Update frontend environment.ts
3. ✅ Build frontend
4. ✅ Deploy frontend to Netlify
5. ✅ Set up UptimeRobot
6. ✅ Test everything
7. 🎉 Share your URL!

Your app is now live and accessible from anywhere in the world, including USA!

**Share your app:**
```
https://your-site-name.netlify.app
```

Need help? Check the logs on Render and Netlify dashboards!
