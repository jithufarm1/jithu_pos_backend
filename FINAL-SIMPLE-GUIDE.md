# Simple Guide: Set Up PIN and Test 🎯

## The Problem

You don't see the PIN field because **you haven't set up a PIN yet**. The IndexedDB database `pos_offline_auth` doesn't exist, which means no PIN was ever stored.

---

## Solution: Set Up PIN (Do This Now!)

### Step 1: Login Online

1. **Go to**: http://localhost:8080
2. **Enter credentials**:
   - User ID: `EMP001`
   - Password: `SecurePass123!`
3. **Click "Submit"**

### Step 2: Set Up PIN

After successful login, a modal should pop up asking you to set up a PIN:

1. **Enter a PIN**: Type `1234` (or any 4-6 digit number)
2. **Confirm PIN**: Type `1234` again
3. **Click "Set PIN"**

### Step 3: Verify PIN is Stored

1. **Press F12** (open DevTools)
2. **Go to Application tab**
3. **Look for "IndexedDB"** in left sidebar
4. **You should now see**: `pos_offline_auth` database
5. **Click on it** → `pin_data` → You should see your PIN stored!

### Step 4: Logout

1. **Click your name** in top-right corner
2. **Click "Logout"**

### Step 5: See the PIN Field!

1. **Go back to login page**: http://localhost:8080
2. **Scroll down**
3. **You should NOW see**:
   - User ID field
   - Password field
   - **"OR" divider**
   - **"Offline PIN" field** ← This is NEW!
   - "Login with PIN" button

---

## If PIN Modal Doesn't Appear

If you login but don't see the PIN setup modal, check the browser console (F12 → Console tab) for errors and tell me what you see.

---

## Test Offline Login (After PIN is Set Up)

Once you have the PIN field visible:

1. **Enter your PIN**: `1234`
2. **Click "Login with PIN"**
3. **Should work!** Even if backend is offline

---

## Current Server Status

✅ **Backend**: Running on http://localhost:3000
✅ **Frontend**: Running on http://localhost:8080
✅ **Appointments API**: Fixed

---

**Do this now**: Login with EMP001 / SecurePass123! and set up your PIN!
