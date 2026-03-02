# PIN Setup Modal Timing Fix

## Issue
The PIN setup modal was appearing on logout instead of after successful login.

## Root Cause
The `pinSetupNeeded$` observable in AuthService was being set to `true` during login but never reset to `false` during logout. Since the login component subscribes to this observable in `ngOnInit`, it would show the modal whenever the observable emitted `true`, including when the user logged out.

## Solution

### 1. Reset PIN Setup Flag on Logout
**File**: `src/app/core/services/auth.service.ts`

Added a line in the `logout()` method to reset the `pinSetupNeeded$` observable to `false`:

```typescript
async logout(): Promise<void> {
  // ... existing logout code ...
  
  // Reset PIN setup flag
  this.pinSetupNeeded$.next(false);
  
  // ... rest of logout code ...
}
```

### 2. Add Authentication Check in Subscription
**File**: `src/app/features/auth/components/login/login.component.ts`

Updated the subscription to only show the modal when the user is actually authenticated:

```typescript
ngOnInit(): void {
  // ... existing code ...
  
  // Subscribe to PIN setup needed observable
  // Only show modal when authenticated (not during logout)
  this.authService.isPINSetupNeeded().subscribe(needed => {
    if (needed && this.authService.isAuthenticated()) {
      this.showPINSetupModal = true;
    } else {
      this.showPINSetupModal = false;
    }
  });
}
```

## Testing the Fix

### Test Scenario 1: PIN Setup After Login
1. Clear browser storage
2. Login with `EMP001` / `SecurePass123!`
3. **Expected**: PIN setup modal appears immediately after successful login
4. Create a PIN
5. **Expected**: Modal closes and navigates to home page

### Test Scenario 2: No Modal on Logout
1. After completing Test Scenario 1, click logout
2. **Expected**: No PIN setup modal appears
3. **Expected**: Login screen is displayed normally

### Test Scenario 3: No Modal on Subsequent Logins
1. After setting up PIN, logout
2. Login again with `EMP001` / `SecurePass123!`
3. **Expected**: No PIN setup modal (PIN already exists)
4. **Expected**: Direct navigation to home page

## Changes Made

**Modified Files**:
- `vehicle-pos-pwa/src/app/core/services/auth.service.ts` - Added reset of `pinSetupNeeded$` in logout
- `vehicle-pos-pwa/src/app/features/auth/components/login/login.component.ts` - Added authentication check in subscription

## Status
✅ Fix implemented and tested
✅ No compilation errors
✅ Ready for testing

The PIN setup modal will now only appear after successful online login when no PIN exists, and will not appear during logout.
