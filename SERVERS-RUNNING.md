# Servers Running - Ready for Offline Testing! ✅

## Current Status

✅ **Production build completed** (with Service Worker)
✅ **Production server running** on http://localhost:8080
✅ **Backend server running** on http://localhost:3000

## Next Steps - Follow These Carefully

### Phase 1: Online Setup (Do This First)

1. **Open your browser** to: `http://localhost:8080`
   - ⚠️ NOT http://localhost:4200 (that's the dev server)
   - Use http://localhost:8080 (production server)

2. **Login** with:
   - Employee ID: `EMP001`
   - Password: `SecurePass123!`

3. **Set up your PIN** when the modal appears:
   - Enter a 4-6 digit PIN (e.g., `1234`)
   - Confirm it
   - Click "Set Up PIN"

4. **Browse around** a bit (optional but helpful):
   - Click on Dashboard
   - Click on Appointments
   - This helps cache more pages

5. **Logout**:
   - Click your name in top right
   - Click "Logout"
   - This locks your token (doesn't delete it)

### Phase 2: Test Offline PIN Authentication

6. **Stop the backend server**:
   - I'll do this for you when you're ready
   - Just let me know when you've completed Phase 1

7. **Try logging in with your PIN**:
   - You should see the "Offline PIN" input field
   - Enter your PIN (e.g., `1234`)
   - Click "Login with PIN"
   - You should be authenticated and redirected to home!

### Phase 3: Full Offline Test (Optional)

8. **Check Service Worker** (optional):
   - Press F12 to open DevTools
   - Go to Application tab
   - Click "Service Workers" in left sidebar
   - Should show "activated and running"

9. **Stop both servers** (I'll do this when you're ready)

10. **Refresh the page**:
    - Press Cmd+R (Mac) or Ctrl+R (Windows)
    - App should still load from Service Worker cache!

11. **Login with PIN**:
    - Should work completely offline

## Important Notes

- **URL must be http://localhost:8080** (not 4200)
- **You must set up PIN first** (while online)
- **You must logout** before testing offline login
- **Service Worker only works on localhost or https**

## Troubleshooting

### "Can't access http://localhost:8080"
- Check that production server is running (it is!)
- Try http://127.0.0.1:8080 instead

### "PIN input not showing"
- Make sure you logged out
- Check browser console (F12) for errors
- Verify you set up a PIN first

### "Invalid PIN"
- Make sure you're using the same browser
- PIN is stored per-device in IndexedDB
- Try setting up PIN again

## Server Management

To stop servers when testing offline:
- Let me know and I'll stop them for you
- Or you can stop them manually with Ctrl+C

To restart servers:
- Let me know and I'll restart them

## What's Happening

**Production Server (http-server)**:
- Serves the built Angular app files
- Includes Service Worker for offline caching
- Runs on port 8080

**Backend Server (Node.js)**:
- Provides authentication API
- Needed for initial online login
- Runs on port 3000
- Can be stopped for offline testing

**Service Worker**:
- Caches app files after first load
- Enables offline functionality
- Registered automatically in production build

**IndexedDB**:
- Stores encrypted PIN hash
- Stores emergency token
- Stores audit logs
- All encrypted with device-specific key

## Ready to Test!

1. Open http://localhost:8080 in your browser
2. Follow Phase 1 steps above
3. Let me know when you're ready for Phase 2 (I'll stop the backend)
4. Test offline PIN authentication!

Good luck! 🚀
