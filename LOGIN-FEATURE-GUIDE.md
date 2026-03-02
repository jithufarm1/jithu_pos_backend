# Employee POS Login Feature Guide

## Overview

The Vehicle POS PWA now includes a complete employee authentication system with login/logout functionality. Employees must log in before accessing the vehicle search features.

## Features Implemented

### 1. Login Screen
- **Location**: `/login` (default route)
- **Enterprise POS-style UI** with gradient background
- **Form Fields**:
  - Employee ID (text input)
  - PIN (password input with show/hide toggle)
- **Validation**:
  - Both fields required
  - PIN must be at least 4 digits
  - Real-time error display
- **Loading State**: Shows spinner during authentication
- **Test Credentials Display**: Visible in development mode

### 2. Authentication Service
- **File**: `src/app/core/services/auth.service.ts`
- **Features**:
  - Login with employee ID and PIN
  - Logout functionality
  - Authentication state management (RxJS BehaviorSubject)
  - LocalStorage persistence (survives page refresh)
  - Token management
  - Current employee information

### 3. Route Protection
- **Auth Guard**: `src/app/core/guards/auth.guard.ts`
- **Protected Routes**: `/vehicle-search` requires authentication
- **Redirect Logic**: Unauthenticated users → `/login`

### 4. Header Updates
- **Employee Info Display**:
  - Employee name
  - Employee ID
  - Logout button
- **Conditional Rendering**: Only shows when authenticated
- **Logout Confirmation**: Prompts user before logging out

### 5. Backend API
- **Endpoint**: `POST /api/auth/login`
- **Mock Employees**:
  - **Employee 1**: ID: `EMP001`, PIN: `1234`, Name: John Smith, Role: Technician
  - **Employee 2**: ID: `EMP002`, PIN: `5678`, Name: Jane Doe, Role: Manager
- **Response**: Returns employee data and authentication token

## Application Flow

```
1. User opens app → Redirected to /login
2. User enters credentials → Submits form
3. AuthService calls backend API → Validates credentials
4. On success:
   - Store auth state in localStorage
   - Update BehaviorSubject
   - Navigate to /vehicle-search
5. Header displays employee info
6. User can access vehicle search features
7. User clicks logout → Confirmation dialog
8. On confirm:
   - Clear auth state
   - Navigate to /login
```

## File Structure

```
src/app/
├── core/
│   ├── guards/
│   │   └── auth.guard.ts                    # Route protection
│   ├── models/
│   │   └── auth.model.ts                    # Auth interfaces
│   └── services/
│       └── auth.service.ts                  # Authentication logic
├── features/
│   ├── auth/
│   │   └── components/
│   │       └── login/
│   │           ├── login.component.ts       # Login component
│   │           ├── login.component.html     # Login template
│   │           └── login.component.css      # Login styles
│   └── vehicle/
│       └── components/
│           └── vehicle-search-container/    # Protected route container
├── shared/
│   └── components/
│       └── header/
│           ├── header.component.ts          # Updated with auth
│           ├── header.component.html        # Employee info display
│           └── header.component.css         # Logout button styles
├── app.routes.ts                            # Route configuration
├── app.component.ts                         # Root component with router
└── app.component.html                       # Router outlet
```

## Testing the Login Feature

### 1. Start the Application

Make sure all servers are running:

```bash
# Frontend Dev Server (port 4200)
cd vehicle-pos-pwa
npm start

# Backend API Server (port 3000)
node mock-backend/server.js
```

### 2. Access the Application

Open your browser to: **http://localhost:4200/**

You should be automatically redirected to the login page.

### 3. Test Login

Use these test credentials:

**Employee 1:**
- Employee ID: `EMP001`
- PIN: `1234`

**Employee 2:**
- Employee ID: `EMP002`
- PIN: `5678`

### 4. Verify Features

After successful login:
- ✅ You should be redirected to `/vehicle-search`
- ✅ Header should display employee name and ID
- ✅ Logout button should be visible
- ✅ You can search for vehicles
- ✅ Refresh the page → You should remain logged in (localStorage persistence)

### 5. Test Logout

- Click the "Logout" button in the header
- Confirm the logout dialog
- You should be redirected to `/login`
- Try accessing `/vehicle-search` directly → Should redirect to `/login`

### 6. Test Invalid Credentials

Try logging in with:
- Invalid Employee ID: `INVALID`
- Invalid PIN: `0000`

You should see an error message: "Invalid employee ID or PIN"

## Security Features

### Current Implementation (Development)
- ✅ PIN input with show/hide toggle
- ✅ Authentication state management
- ✅ Route protection with auth guard
- ✅ Token-based authentication
- ✅ LocalStorage persistence
- ✅ Logout confirmation

### Production Recommendations
For a production deployment, consider:
- 🔒 HTTPS only
- 🔒 JWT token with expiration
- 🔒 Refresh token mechanism
- 🔒 Session timeout
- 🔒 Password hashing (bcrypt)
- 🔒 Rate limiting on login endpoint
- 🔒 Account lockout after failed attempts
- 🔒 Audit logging
- 🔒 CORS configuration
- 🔒 HTTP-only cookies for tokens

## API Documentation

### POST /api/auth/login

**Request:**
```json
{
  "employeeId": "EMP001",
  "pin": "1234"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "employee": {
    "id": "1",
    "employeeId": "EMP001",
    "name": "John Smith",
    "role": "Technician",
    "storeId": "STORE-001"
  },
  "token": "mock-token-1234567890"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid employee ID or PIN"
}
```

## Troubleshooting

### Issue: Login button not working
- Check browser console for errors
- Verify backend server is running on port 3000
- Check network tab for API call

### Issue: Redirected to login after successful authentication
- Check localStorage for `pos_auth_state`
- Verify auth guard is working correctly
- Check browser console for errors

### Issue: Employee info not showing in header
- Verify AuthService is injected in HeaderComponent
- Check that getAuthState() subscription is working
- Inspect component state in Angular DevTools

### Issue: Backend API not responding
- Verify server is running: `http://localhost:3000/api/auth/login`
- Check server logs for errors
- Restart backend server if needed

## Next Steps

To enhance the login feature:

1. **Add "Remember Me" functionality**
2. **Implement session timeout**
3. **Add password reset flow**
4. **Implement role-based access control**
5. **Add audit logging for login attempts**
6. **Implement multi-factor authentication**
7. **Add employee profile page**
8. **Implement password change functionality**

## Related Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Application setup guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Application architecture
- [PWA-INSTALLATION-GUIDE.md](./PWA-INSTALLATION-GUIDE.md) - PWA installation
- [TESTING-GUIDE.md](./TESTING-GUIDE.md) - Testing instructions
