# Multi-User PIN Support - Feature Request

## Current Limitation

The current offline PIN authentication only supports **one PIN per device**. This means:
- Only one employee can set up a PIN
- When a different employee logs in, they can't set up their own PIN
- The PIN field shows for all employees, but only works for the one who set it up

## Required Changes

To support multiple employees on the same device, we need:

### 1. Multi-User PIN Storage
- Store PINs keyed by employee ID
- Each employee has their own PIN hash
- Each employee has their own attempt counter and lock status

### 2. Login Flow Changes
**Current Flow:**
```
[User ID] [Password] [Submit]
OR
[PIN] [Login with PIN]
```

**New Flow:**
```
[User ID] [Password] [Submit]
OR
[User ID] [PIN] [Login with PIN]
```

### 3. Data Structure Changes

**Current (Single User):**
```
IndexedDB: pin-storage
  - id: "user-pin"
  - pinHash: "encrypted_hash"
  - attemptCount: 0
  - locked: false
```

**New (Multi User):**
```
IndexedDB: pin-storage
  - id: "EMP001"
  - pinHash: "encrypted_hash_for_emp001"
  - attemptCount: 0
  - locked: false
  
  - id: "EMP002"
  - pinHash: "encrypted_hash_for_emp002"
  - attemptCount: 0
  - locked: false
```

### 4. Token Storage Changes

**Current:** One token per device
**New:** Multiple tokens, one per employee

### 5. UI Changes

**Login Page:**
- Add Employee ID field to PIN login section
- Validate both Employee ID and PIN
- Show "No PIN set up for this employee" if they haven't configured one

**PIN Setup Modal:**
- Associate PIN with the logged-in employee
- Show employee ID in the modal

## Implementation Complexity

This is a **medium-to-large** feature that touches:
- ✅ PIN storage architecture (IndexedDB schema)
- ✅ Token storage architecture
- ✅ Login component UI
- ✅ PIN service logic
- ✅ Auth service logic
- ✅ PIN repository
- ✅ Token repository

## Recommendation

This should be implemented as a **new spec** with proper:
1. Requirements document
2. Design document
3. Task breakdown
4. Testing plan

## Workaround (Current System)

For now, to test with multiple employees:
1. Clear IndexedDB between employee logins
2. Each employee sets up their PIN fresh
3. Only one employee can use PIN login at a time

---

**Would you like me to create a full spec for multi-user PIN support?**

This would include:
- Detailed requirements
- Architecture design
- Implementation tasks
- Migration plan for existing single-user PINs
