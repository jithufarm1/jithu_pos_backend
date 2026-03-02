# Quick Fix: Service Catalog Error

## The Problem
"Failed to load service catalog" error on Create Service Ticket page.

## The Solution (30 seconds)

### 1. Start Mock Backend
```bash
cd vehicle-pos-pwa
npm run backend
```

Wait for: `JSON Server is running on http://localhost:3000`

### 2. Hard Refresh Browser
- **Mac**: Cmd + Shift + R
- **Windows/Linux**: Ctrl + Shift + R

### 3. Test
- Go to: http://localhost:4200
- Login: EMP001 / SecurePass123!
- Click "New Service Ticket"
- ✅ Should see service catalog tabs (no error)

## That's It!

The error happens because the frontend can't connect to the backend API. Starting the mock backend fixes it.

## Verify It's Working

You should see:
- 8 category tabs (Oil Change, Filters, Battery, etc.)
- No error message
- Services appear when you click tabs

## Still Not Working?

See `CATALOG-ERROR-FIX.md` for detailed troubleshooting.

---

**TL;DR**: Run `npm run backend` in the vehicle-pos-pwa directory, then hard refresh your browser.
