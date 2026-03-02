# Clear Login Lockout

If you're unable to login with correct credentials, the account may be locked due to previous failed attempts.

## Quick Fix - Clear Browser Storage

Open the browser console (F12) and run:

```javascript
// Clear all login attempt records
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('pos_login_attempts_')) {
    localStorage.removeItem(key);
  }
});

// Refresh the page
location.reload();
```

## Alternative - Wait for Lockout to Expire

The account lockout expires after 15 minutes of inactivity.

## Test Credentials

After clearing the lockout, use these credentials:

**Technician:**
- Employee ID: `EMP001`
- Password: `SecurePass123!`

**Manager:**
- Employee ID: `EMP002`
- Password: `Manager@2024`

## Password Requirements

Passwords must have:
- At least 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*...)

## Backend Status

The backend server is running on http://localhost:3000

You can test the login endpoint directly:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"EMP001","password":"SecurePass123!"}'
```

This should return a success response with employee data and token.
