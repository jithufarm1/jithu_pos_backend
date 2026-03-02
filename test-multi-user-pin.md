# Multi-User PIN Authentication - Test Guide

## Test Environment
- **Backend Server**: http://localhost:3000 (running)
- **Production App**: http://localhost:8080 (running)
- **Database**: IndexedDB `vehicle-pos-db`

## Test Credentials
- **Employee 1**: EMP001 / SecurePass123!
- **Employee 2**: EMP002 / Manager@2024

---

## Test Scenario 1: Fresh Setup - Two Employees Set Up PINs

### Step 1.1: Clear All Data (Fresh Start)
```javascript
// Open browser console at http://localhost:8080
indexedDB.deleteDatabase('vehicle-pos-db');
localStorage.clear();
// Refresh page (Cmd+Shift+R / Ctrl+Shift+R)
```

### Step 1.2: Employee 1 - Online Login and PIN Setup
1. Navigate to http://localhost:8080
2. Login with: **EMP001** / **SecurePass123!**
3. PIN setup modal should appear showing:
   - "Setting up PIN for: **[Employee Name]** (EMP001)"
4. Enter PIN: **1234**
5. Confirm PIN: **1234**
6. Click "Set Up PIN"
7. Should see success message
8. Logout

**Expected Result**: ✅ EMP001 PIN stored with key "EMP001" in IndexedDB

### Step 1.3: Employee 2 - Online Login and PIN Setup
1. Login with: **EMP002** / **Manager@2024**
2. PIN setup modal should appear showing:
   - "Setting up PIN for: **[Employee Name]** (EMP002)"
3. Enter PIN: **5678**
4. Confirm PIN: **5678**
5. Click "Set Up PIN"
6. Should see success message
7. Logout

**Expected Result**: ✅ EMP002 PIN stored with key "EMP002" in IndexedDB

### Step 1.4: Verify Database State
```javascript
// Open browser console
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('vehicle-pos-db');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const tx = db.transaction('pin-storage', 'readonly');
const store = tx.objectStore('pin-storage');
const allPins = await new Promise((resolve) => {
  const request = store.getAll();
  request.onsuccess = () => resolve(request.result);
});

console.log('All PINs:', allPins);
// Should show 2 records: one with id="EMP001", one with id="EMP002"
```

**Expected Result**: ✅ Two separate PIN records exist

---

## Test Scenario 2: Offline Login - Employee Isolation

### Step 2.1: Go Offline
- Open DevTools → Network tab
- Check "Offline" checkbox
- OR disconnect from internet

### Step 2.2: Employee 1 Offline Login (Correct PIN)
1. Refresh page
2. Should see "Offline Login" section with:
   - Employee ID field
   - PIN field
3. Enter Employee ID: **EMP001**
4. Enter PIN: **1234**
5. Click "Login with PIN"

**Expected Result**: ✅ Successfully logged in as EMP001

### Step 2.3: Logout and Test Employee 2
1. Logout
2. Enter Employee ID: **EMP002**
3. Enter PIN: **5678**
4. Click "Login with PIN"

**Expected Result**: ✅ Successfully logged in as EMP002

---

## Test Scenario 3: PIN Verification Isolation

### Step 3.1: Wrong PIN for Employee 1
1. Logout
2. Enter Employee ID: **EMP001**
3. Enter PIN: **5678** (EMP002's PIN)
4. Click "Login with PIN"

**Expected Result**: ❌ Login fails with "Invalid Employee ID or PIN"

### Step 3.2: Wrong PIN for Employee 2
1. Enter Employee ID: **EMP002**
2. Enter PIN: **1234** (EMP001's PIN)
3. Click "Login with PIN"

**Expected Result**: ❌ Login fails with "Invalid Employee ID or PIN"

---

## Test Scenario 4: Attempt Counter Isolation

### Step 4.1: Lock Employee 1 with Failed Attempts
1. Enter Employee ID: **EMP001**
2. Enter wrong PIN: **9999**
3. Click "Login with PIN" → Should show "2 attempt(s) remaining"
4. Enter wrong PIN: **9999** again
5. Click "Login with PIN" → Should show "1 attempt(s) remaining"
6. Enter wrong PIN: **9999** again
7. Click "Login with PIN" → Should show "PIN locked"

**Expected Result**: ✅ EMP001 is locked after 3 failed attempts

### Step 4.2: Verify Employee 2 Still Works
1. Enter Employee ID: **EMP002**
2. Enter PIN: **5678**
3. Click "Login with PIN"

**Expected Result**: ✅ EMP002 can still login (not affected by EMP001's lock)

### Step 4.3: Verify Employee 1 is Locked
1. Logout
2. Enter Employee ID: **EMP001**
3. Enter correct PIN: **1234**
4. Click "Login with PIN"

**Expected Result**: ❌ Login fails with "PIN locked" message

---

## Test Scenario 5: Token Storage Isolation

### Step 5.1: Verify Separate Tokens
```javascript
// Open browser console
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('vehicle-pos-db');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const tx = db.transaction('token-storage', 'readonly');
const store = tx.objectStore('token-storage');
const allTokens = await new Promise((resolve) => {
  const request = store.getAll();
  request.onsuccess = () => resolve(request.result);
});

console.log('All Tokens:', allTokens);
// Should show tokens with keys like "auth_token_EMP001", "auth_token_EMP002"
```

**Expected Result**: ✅ Separate token records for each employee

---

## Test Scenario 6: Logout Isolation

### Step 6.1: Login as Employee 2 and Logout
1. Go back online (uncheck "Offline" in DevTools)
2. Refresh page
3. Login with: **EMP002** / **Manager@2024**
4. Logout

### Step 6.2: Go Offline and Test Employee 1
1. Go offline again
2. Enter Employee ID: **EMP001**
3. Enter PIN: **1234**
4. Click "Login with PIN"

**Expected Result**: ❌ EMP001 is still locked (from Step 4.1)

### Step 6.3: Unlock Employee 1 Online
1. Go back online
2. Login with: **EMP001** / **SecurePass123!**
3. Should successfully login (resets attempt counter)
4. Logout

### Step 6.4: Test Employee 1 Offline Again
1. Go offline
2. Enter Employee ID: **EMP001**
3. Enter PIN: **1234**
4. Click "Login with PIN"

**Expected Result**: ✅ EMP001 can now login (attempts were reset)

---

## Test Scenario 7: Migration from Single-User

### Step 7.1: Simulate Legacy Single-User PIN
```javascript
// Open browser console
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('vehicle-pos-db');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

// Create legacy PIN record
const tx = db.transaction('pin-storage', 'readwrite');
const store = tx.objectStore('pin-storage');
store.put({
  id: 'user-pin',  // Legacy key
  pinHash: '$2a$10$someHashValue',
  attemptCount: 0,
  locked: false,
  createdAt: new Date().toISOString(),
  lastVerifiedAt: new Date().toISOString()
});

await new Promise((resolve) => {
  tx.oncomplete = resolve;
});

console.log('Legacy PIN created');
```

### Step 7.2: Login Online to Trigger Migration
1. Go online
2. Login with: **EMP001** / **SecurePass123!**
3. System should detect legacy PIN and migrate it

### Step 7.3: Verify Migration
```javascript
// Check if legacy PIN was migrated
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('vehicle-pos-db');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const tx = db.transaction('pin-storage', 'readonly');
const store = tx.objectStore('pin-storage');

// Check for legacy PIN (should be deleted)
const legacyPIN = await new Promise((resolve) => {
  const request = store.get('user-pin');
  request.onsuccess = () => resolve(request.result);
});

// Check for migrated PIN (should exist)
const migratedPIN = await new Promise((resolve) => {
  const request = store.get('EMP001');
  request.onsuccess = () => resolve(request.result);
});

console.log('Legacy PIN:', legacyPIN);  // Should be undefined
console.log('Migrated PIN:', migratedPIN);  // Should exist
```

**Expected Result**: ✅ Legacy PIN migrated to EMP001, legacy record deleted

---

## Test Scenario 8: Error Handling

### Step 8.1: Missing Employee ID
1. Go offline
2. Leave Employee ID field empty
3. Enter PIN: **1234**
4. Click "Login with PIN"

**Expected Result**: ❌ Button should be disabled (validation)

### Step 8.2: Missing PIN
1. Enter Employee ID: **EMP001**
2. Leave PIN field empty
3. Click "Login with PIN"

**Expected Result**: ❌ Button should be disabled (validation)

### Step 8.3: Employee with No PIN
1. Enter Employee ID: **EMP003** (doesn't exist)
2. Enter PIN: **1234**
3. Click "Login with PIN"

**Expected Result**: ❌ Error message: "Employee EMP003 has no PIN configured"

---

## Test Scenario 9: UI/UX Verification

### Step 9.1: PIN Setup Modal Shows Employee Context
1. Go online
2. Clear database and login as EMP001
3. PIN setup modal should display:
   - Employee name
   - Employee ID (EMP001)
   - Styled with blue highlight

**Expected Result**: ✅ Employee context clearly visible

### Step 9.2: Online/Offline Indicator
1. Check top-right corner for online/offline badge
2. Toggle network in DevTools
3. Badge should update in real-time

**Expected Result**: ✅ Badge shows correct status with animation

### Step 9.3: Login Page Layout
1. Offline login section should show:
   - Employee ID input field
   - PIN input field
   - Both fields required for button to be enabled

**Expected Result**: ✅ Clean, intuitive layout

---

## Success Criteria Checklist

- [ ] Multiple employees can set up PINs on the same device
- [ ] Each employee can login offline with their employee ID + PIN
- [ ] Failed attempts for one employee don't affect others
- [ ] Lock status is independent per employee
- [ ] Tokens are stored separately per employee
- [ ] Logout locks only the current employee's token
- [ ] Legacy single-user PINs are migrated successfully
- [ ] PIN setup modal shows employee context
- [ ] Error messages are clear and helpful
- [ ] UI is intuitive and responsive

---

## Troubleshooting

### Issue: PIN setup modal doesn't show employee context
**Solution**: Check browser console for errors, verify getCurrentEmployee() returns employee data

### Issue: Offline login doesn't work
**Solution**: 
1. Verify you're using production build (port 8080, not 4200)
2. Check IndexedDB has PIN records
3. Verify token is stored and not locked

### Issue: Employee gets locked unexpectedly
**Solution**: Check attempt counter in IndexedDB, may need to reset by logging in online

### Issue: Migration doesn't work
**Solution**: Verify legacy PIN record exists with id="user-pin" before logging in

---

## Database Inspection Commands

### View all PINs
```javascript
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('vehicle-pos-db');
  request.onsuccess = () => resolve(request.result);
});
const tx = db.transaction('pin-storage', 'readonly');
const allPins = await new Promise((resolve) => {
  const request = tx.objectStore('pin-storage').getAll();
  request.onsuccess = () => resolve(request.result);
});
console.table(allPins);
```

### View all tokens
```javascript
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('vehicle-pos-db');
  request.onsuccess = () => resolve(request.result);
});
const tx = db.transaction('token-storage', 'readonly');
const allTokens = await new Promise((resolve) => {
  const request = tx.objectStore('token-storage').getAll();
  request.onsuccess = () => resolve(request.result);
});
console.table(allTokens);
```

### Reset specific employee's PIN
```javascript
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('vehicle-pos-db');
  request.onsuccess = () => resolve(request.result);
});
const tx = db.transaction('pin-storage', 'readwrite');
await new Promise((resolve) => {
  const request = tx.objectStore('pin-storage').delete('EMP001');
  request.onsuccess = resolve;
});
console.log('EMP001 PIN deleted');
```
