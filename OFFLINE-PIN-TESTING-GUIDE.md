# Offline PIN Authentication Testing Guide

## The Problem

When you stop the Angular dev server (`ng serve`), the application files are no longer served, so the browser can't load anything. This is expected behavior for development mode.

## The Solution: Production Build with Service Worker

For offline functionality to work, you need to:
1. Build the production version (with Service Worker)
2. Serve it from a static server
3. Load it once while online (Service Worker caches files)
4. Then test offline

---

## Step-by-Step Testing Instructions

### Step 1: Build Production Version

```bash
cd vehicle-pos-pwa
npm run build
```

This creates optimized files in `dist/vehicle-pos-pwa/` with Service Worker enabled.

### Step 2: Install a Static Server (One-Time Setup)

```bash
npm install -g http-server
```

### Step 3: Start Backend Server

In one terminal:
```bash
cd vehicle-pos-pwa
node mock-backend/server.js
```

Keep this running - you'll need it for the initial login.

### Step 4: Serve Production Build

In another terminal:
```bash
cd vehicle-pos-pwa/dist/vehicle-pos-pwa
http-server -p 8080 -c-1
```

The `-c-1` flag disables caching so you always get fresh files.

### Step 5: Initial Online Setup

1. Open browser to `http://localhost:8080`
2. Login with credentials: `EMP001` / `SecurePass123!`
3. Set up your PIN when prompted
4. Navigate around the app a bit (this helps cache more pages)
5. Logout (this locks your token)

### Step 6: Test Offline PIN Authentication

Now you can test offline:

1. **Stop ONLY the backend server** (Ctrl+C in the backend terminal)
   - Keep the http-server running!
2. In the browser, you should still see the login page
3. Enter your PIN in the "Offline PIN" field
4. Click "Login with PIN"
5. You should be authenticated and redirected to home page

### Step 7: Full Offline Test (Optional)

To test with BOTH servers stopped:

1. Make sure you've completed Steps 1-5 above
2. In Chrome DevTools (F12):
   - Go to Application tab
   - Click "Service Workers" in left sidebar
   - Verify the Service Worker is "activated and running"
3. Stop BOTH servers (backend and http-server)
4. Refresh the page (Cmd+R / Ctrl+R)
5. The app should still load from Service Worker cache
6. Try logging in with your PIN

---

## Troubleshooting

### "Application not opening at all"
- Make sure http-server is still running
- Check the URL is `http://localhost:8080` (not 4200)
- Clear browser cache and rebuild

### "PIN input not showing"
- You need to have set up a PIN first (while online)
- Check browser console for errors
- Verify you logged out (token must be locked)

### "Service Worker not working"
- Service Workers only work on `localhost` or `https://`
- Check DevTools → Application → Service Workers
- Try clearing Service Worker and rebuilding

### "Can't see cached data"
- The app caches data in IndexedDB, not Service Worker
- Check DevTools → Application → IndexedDB
- Look for databases: `pos_pin_db`, `pos_token_db`, etc.

---

## Quick Test Script

Here's a quick way to test everything:

```bash
# Terminal 1: Build and serve production
cd vehicle-pos-pwa
npm run build
cd dist/vehicle-pos-pwa
http-server -p 8080 -c-1

# Terminal 2: Start backend (for initial login)
cd vehicle-pos-pwa
node mock-backend/server.js

# Browser:
# 1. Go to http://localhost:8080
# 2. Login: EMP001 / SecurePass123!
# 3. Set up PIN: 1234
# 4. Logout

# Terminal 2: Stop backend (Ctrl+C)

# Browser:
# 5. Enter PIN: 1234
# 6. Click "Login with PIN"
# 7. Should work offline!
```

---

## Understanding the Architecture

**Development Mode (`ng serve`):**
- Files served dynamically by webpack dev server
- No Service Worker
- Stops working when server stops

**Production Mode (built + http-server):**
- Files pre-built and optimized
- Service Worker caches files
- Works offline after initial load
- IndexedDB stores authentication data

**Offline Authentication:**
- PIN stored in IndexedDB (encrypted)
- Token locked in localStorage (not deleted)
- No server needed for re-authentication
- Works completely offline

---

## Current Status

✅ PIN setup working
✅ PIN storage in IndexedDB
✅ Token locking on logout
✅ Offline authentication logic implemented
⚠️ Need production build to test full offline mode

## Next Steps

1. Build production version
2. Test with http-server
3. Verify Service Worker caching
4. Test offline PIN authentication
5. Test with both servers stopped
