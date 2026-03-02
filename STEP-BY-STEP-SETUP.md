# Step-by-Step: Complete Setup Guide 🎯

## Current Status ✅

- **Backend Server**: ✅ RUNNING on http://localhost:3000 (Process ID: 11)
- **Production Server**: ✅ RUNNING on http://localhost:8080 (Process ID: 8)
- **Appointments API**: ✅ Fixed and ready

---

## IMPORTANT: You Must Do This IN ORDER!

The PIN feature is NOT visible until you complete Step 1 first!

---

## Step 1: First Time Online Login (REQUIRED)

**You MUST do this first to set up your PIN!**

1. **Open your browser**: http://localhost:8080

2. **You should see**:
   - Green "Online" badge in top-right corner
   - Login form with User ID and Password fields
   - NO PIN field yet (this is normal!)

3. **Login with these credentials**:
   ```
   User ID: EMP001
   Password: SecurePass123!
   ```

4. **After successful login**:
   - You'll be redirected to the home page
   - A modal will pop up asking you to set up a PIN
   - Enter a 4-6 digit PIN (e.g., `1234`)
   - Confirm the PIN
   - Click "Set PIN"

5. **Logout**:
   - Click your name in the top-right corner
   - Click "Logout"

---

## Step 2: Now You Can See PIN Login!

After completing Step 1, go back to the login page:

1. **Refresh the page**: http://localhost:8080

2. **You should NOW see**:
   - User ID field
   - Password field
   - **"OR" divider**
   - **"Offline PIN" field** ← This is NEW!
   - "Login with PIN" button

---

## Step 3: Test Regular Login (Online)

With backend running, test normal login:

1. **Enter credentials**:
   - User ID: `EMP001`
   - Password: `SecurePass123!`

2. **Click "Submit"**

3. **Result**: ✅ Should login successfully

---

## Step 4: Test Offline PIN Login

Now test offline authentication:

### Option A: Stop Backend Server

1. **I can stop the backend for you** (just ask)
2. **Try regular login**: Will FAIL
3. **Use PIN login**: Enter `1234` → Will SUCCEED!

### Option B: Use DevTools Offline Mode

1. **Press F12** to open DevTools
2. **Go to Network tab**
3. **Check "Offline" checkbox**
4. **Watch indicator turn red** "Offline"
5. **Try PIN login**: Enter `1234` → Will SUCCEED!

---

## Step 5: Test Appointments

With backend running:

1. **Login to the app**
2. **Click "Appointments"** in the menu
3. **Click "Schedule Appointment"** or create new
4. **Fill in the form**
5. **Click "Save"**
6. **Result**: ✅ Should work! (404 error is fixed)

---

## Troubleshooting

### "Invalid User Id or Password" Error

**Cause**: Backend server not running OR wrong credentials

**Solution**:
- Check backend is running (green "Online" badge)
- Use exact credentials: `EMP001` / `SecurePass123!`
- Try the other account: `EMP002` / `Manager@2024`

### "I don't see PIN field on login page"

**Cause**: You haven't completed Step 1 yet

**Solution**:
- You MUST login online first (Step 1)
- Set up your PIN when the modal appears
- Logout
- Then the PIN field will appear

### "PIN login not working"

**Cause**: PIN not set up OR wrong PIN

**Solution**:
- Make sure you completed Step 1
- Use the exact PIN you set up (e.g., `1234`)
- Click "Clear Lockout" button if locked out
- Try setting up PIN again

### Appointments 404 Error

**Cause**: Old issue (now fixed!)

**Solution**:
- Backend server has been updated
- Restart backend if needed
- Should work now!

---

## Quick Reference

### Test Credentials

**Employee 1 (Technician)**:
- User ID: `EMP001`
- Password: `SecurePass123!`

**Employee 2 (Manager)**:
- User ID: `EMP002`
- Password: `Manager@2024`

### Server URLs

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000

### Server Status

Check if servers are running:
- Green "Online" badge = Frontend running
- Can login with password = Backend running
- Can use PIN = Offline auth working

---

## What to Do Right Now

1. **Open**: http://localhost:8080
2. **Login**: EMP001 / SecurePass123!
3. **Set PIN**: When modal appears, enter 1234
4. **Logout**
5. **Come back and tell me**: "PIN is set up"

Then I'll help you test offline login and appointments!

---

**Current Status**: Both servers are running. You're ready to start Step 1!
