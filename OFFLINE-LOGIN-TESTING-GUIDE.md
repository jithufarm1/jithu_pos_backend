# Offline Login Testing Guide 🔒

## Issues Fixed ✅

1. **Appointments API**: Added `/api/appointments` endpoint to backend server
2. **Backend Server**: Restarted with appointments support

## Current Server Status

✅ **Backend Server**: Running on http://localhost:3000 (Process ID: 10)
✅ **Production Server**: Running on http://localhost:8080 (Process ID: 8)
✅ **Appointments Endpoint**: Now available

---

## How to Test Offline Login

### Phase 1: Online Setup (REQUIRED FIRST)

You must complete this phase while ONLINE to set up your PIN.

1. **Open the app**: http://localhost:8080
2. **Verify you're online**: Look for green "Online" badge in top-right corner
3. **Login with credentials**:
   - User ID: `EMP001`
   - Password: `SecurePass123!`
4. **Set up PIN**: After login, a modal will appear
   - Enter a 4-6 digit PIN (e.g., `1234`)
   - Confirm the PIN
   - Click "Set PIN"
5. **Logout**: Click your name in top-right → Logout

### Phase 2: Test Offline Login

Now you can test offline authentication with your PIN.

#### Method 1: Using Chrome DevTools (Recommended)

1. **Open DevTools**: Press F12 or right-click → Inspect
2. **Go to Network tab**
3. **Enable Offline mode**: Check the "Offline" checkbox
4. **Watch the indicator**: The badge should turn red "Offline"
5. **Try to login**:
   - Enter User ID: `EMP001`
   - Enter Password: `SecurePass123!`
   - Click Submit
   - **Expected**: Login fails (no backend connection)
6. **Login with PIN**:
   - Scroll down to "Offline PIN" section
   - Enter your PIN: `1234`
   - Click "Login with PIN"
   - **Expected**: Login succeeds! You're authenticated offline!

#### Method 2: Stop Backend Server

1. **I'll stop the backend server for you**
2. **Watch the indicator**: Should still show "Online" (frontend server running)
3. **Try regular login**: Will fail (no backend)
4. **Use PIN login**: Will succeed!

#### Method 3: Disconnect Network (Real Offline)

1. **Disconnect WiFi/Network** on your computer
2. **Watch the indicator**: Should turn red "Offline"
3. **Refresh the page**: App should still load (Service Worker)
4. **Login with PIN**: Should work!

---

## Let Me Stop the Backend Server for You

I'll stop the backend server so you can test offline login right now:

**Command**: Stopping backend server (Process ID: 10)

After I stop it:
1. Go to http://localhost:8080
2. Try logging in with EMP001 / SecurePass123! → Will fail
3. Use PIN login with your PIN → Will succeed!

---

## Testing Appointments (Online Required)

The appointments feature requires the backend server to be running.

### To Test Appointments:

1. **Make sure backend is running** (I'll restart it after offline testing)
2. **Login to the app**
3. **Navigate to Appointments**: Click "Appointments" in the menu
4. **Create an appointment**:
   - Select date and time
   - Choose service type
   - Enter customer details
   - Click "Schedule Appointment"
5. **Should work now!** The 404 error is fixed.

---

## Quick Commands Reference

### Check Running Servers
```bash
# Production server should be on port 8080
# Backend server should be on port 3000
```

### Restart Backend Server (if needed)
```bash
cd vehicle-pos-pwa
node mock-backend/server.js
```

### Rebuild Production (if you make code changes)
```bash
cd vehicle-pos-pwa
./test-offline.sh
```

---

## What's Next?

1. **First**: Complete Phase 1 (online setup) if you haven't
2. **Then**: I'll stop the backend server for offline testing
3. **Test**: Try PIN login while offline
4. **Finally**: I'll restart backend for appointments testing

---

## Troubleshooting

### "PIN not set up" error
- You need to complete Phase 1 first (online login + PIN setup)
- Clear browser storage and start over

### PIN login not working
- Make sure you're using the correct PIN you set up
- Check browser console for errors (F12)
- Try clearing lockout: Click "Clear Lockout" button on login page

### Appointments 404 error
- Backend server must be running
- I've added the endpoint, so restart backend if needed

### Online/Offline indicator not changing
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Check DevTools Network tab "Offline" checkbox

---

**Ready to test?** Let me know and I'll stop the backend server for you!
