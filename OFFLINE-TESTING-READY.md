# Offline PIN Authentication - Ready to Test! 🚀

## Why the App Didn't Work When Servers Stopped

When you stopped the Angular dev server (`ng serve`), the application files were no longer being served. The dev server doesn't use Service Workers, so there's no offline caching in development mode.

**Development mode** = Files served dynamically, no offline support
**Production mode** = Files pre-built, Service Worker caches everything, works offline

## Quick Start - Two Options

### Option 1: Automated Script (Easiest)

```bash
cd vehicle-pos-pwa
./test-offline.sh
```

This will:
1. Build the production version
2. Give you step-by-step instructions
3. Start the production server when you're ready

### Option 2: Manual Steps

```bash
# Terminal 1: Build and serve production
cd vehicle-pos-pwa
npm run build
cd dist/vehicle-pos-pwa
npx http-server -p 8080 -c-1

# Terminal 2: Start backend
cd vehicle-pos-pwa
node mock-backend/server.js
```

Then follow the testing steps below.

---

## Testing Steps

### Phase 1: Online Setup (Backend Running)

1. **Open browser** to `http://localhost:8080` (NOT 4200!)
2. **Login** with: `EMP001` / `SecurePass123!`
3. **Set up PIN** when prompted (e.g., `1234`)
4. **Browse around** a bit (helps cache more pages)
5. **Logout** (this locks your token)

### Phase 2: Offline PIN Test (Backend Stopped)

6. **Stop the backend server** (Ctrl+C in backend terminal)
   - Keep http-server running!
7. **Enter your PIN** in the "Offline PIN" field
8. **Click "Login with PIN"**
9. **Success!** You should be authenticated offline

### Phase 3: Full Offline Test (Both Servers Stopped)

10. **Check Service Worker** in Chrome DevTools:
    - F12 → Application → Service Workers
    - Should show "activated and running"
11. **Stop http-server** (Ctrl+C)
12. **Refresh the page** (Cmd+R / Ctrl+R)
13. **App still loads!** From Service Worker cache
14. **Login with PIN** - works completely offline

---

## What's Happening Behind the Scenes

### When You Login Online:
1. Backend validates credentials
2. Returns JWT token (48-hour expiration)
3. Token stored in localStorage
4. Last sync time recorded

### When You Set Up PIN:
1. PIN hashed with bcrypt (work factor 10)
2. Hash encrypted with device-specific key
3. Stored in IndexedDB (encrypted)
4. Emergency token generated and stored

### When You Logout:
1. Token marked as "locked" (not deleted!)
2. Auth state set to unauthenticated
3. Login screen shown
4. All data preserved for offline re-auth

### When You Login with PIN (Offline):
1. PIN verified against stored hash (bcrypt)
2. Expiration tier checked (normal/warning/grace/override)
3. Token unlocked if PIN valid
4. Auth state restored
5. Audit log entry created
6. You're back in!

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Browser                              │
├─────────────────────────────────────────────────────────┤
│  Service Worker (caches app files)                      │
│  ├─ index.html, *.js, *.css, assets                    │
│  └─ Works offline after first load                      │
├─────────────────────────────────────────────────────────┤
│  IndexedDB (encrypted data)                             │
│  ├─ PIN hash (bcrypt + device key encryption)          │
│  ├─ Emergency token (encrypted)                         │
│  ├─ Override codes (encrypted)                          │
│  ├─ Audit logs (pending sync)                           │
│  └─ Configuration (expiration tiers)                    │
├─────────────────────────────────────────────────────────┤
│  localStorage (token management)                         │
│  ├─ JWT token (locked/unlocked flag)                   │
│  ├─ Last sync time                                      │
│  ├─ Auth state (employee info)                          │
│  └─ Last auth timestamp (clock tampering detection)    │
└─────────────────────────────────────────────────────────┘
```

---

## Security Features

✅ **PIN hashing** - bcrypt with work factor 10
✅ **Encryption** - All sensitive data encrypted with device key
✅ **Attempt limiting** - 3 failed attempts locks PIN
✅ **Clock tampering detection** - Detects system time manipulation
✅ **Expiration tiers** - Progressive warnings (7/14/30 days)
✅ **Audit logging** - All auth events logged
✅ **Device isolation** - PIN unique per device
✅ **Token locking** - Soft logout preserves session

---

## Troubleshooting

### "Application not opening"
- ✅ Make sure http-server is running on port 8080
- ✅ Check URL is `http://localhost:8080` (not 4200)
- ✅ Build completed successfully (`npm run build`)

### "PIN input not showing"
- ✅ You must set up PIN first (while online)
- ✅ You must logout (token must be locked)
- ✅ Check `canAuthenticateOffline()` returns true

### "Invalid PIN" but PIN is correct
- ✅ Check browser console for errors
- ✅ Verify PIN was set up in same browser
- ✅ Clear IndexedDB and set up PIN again

### "Service Worker not activated"
- ✅ Service Workers only work on localhost or https
- ✅ Check DevTools → Application → Service Workers
- ✅ Try unregistering and rebuilding

---

## Verification Checklist

Before testing offline, verify:

- [ ] Production build completed (`npm run build`)
- [ ] http-server running on port 8080
- [ ] Backend server running (for initial login)
- [ ] Logged in successfully online
- [ ] PIN set up (4-6 digits)
- [ ] Logged out (token locked)
- [ ] Service Worker activated (check DevTools)

Now you're ready to test offline!

---

## Files Created

- `OFFLINE-PIN-TESTING-GUIDE.md` - Detailed testing guide
- `test-offline.sh` - Automated build and serve script
- `OFFLINE-TESTING-READY.md` - This file

## Next Steps

1. Run `./test-offline.sh` or follow manual steps
2. Complete Phase 1 (online setup)
3. Test Phase 2 (offline PIN with http-server)
4. Test Phase 3 (full offline with Service Worker)
5. Report any issues you encounter

Good luck! 🎉
