# Fix: "Failed to load service catalog" Error

## Problem

You're seeing "Failed to load service catalog" error on the Create Service Ticket page.

## Root Cause

The frontend cannot connect to the mock backend API at `http://localhost:3000/api/service-catalog`.

## Solution

### Step 1: Verify Mock Backend is Running

Check if the mock backend server is running:

```bash
# Check if port 3000 is in use
lsof -i :3000
# OR on Windows
netstat -ano | findstr :3000
```

If nothing is running on port 3000, start the mock backend:

```bash
cd vehicle-pos-pwa
npm run backend
```

You should see:
```
JSON Server is running on http://localhost:3000
API Endpoints:
  ...
  GET /api/service-catalog
  GET /api/service-catalog/services
  ...
```

### Step 2: Test the Endpoint Directly

Open a new terminal and test the endpoint:

```bash
curl http://localhost:3000/api/service-catalog
```

You should see JSON output with:
- `version`: "1.0.0"
- `lastUpdated`: timestamp
- `categories`: array of 8 categories
- `services`: array of 36 services

If you get an error or empty response, the mock backend needs to be restarted.

### Step 3: Restart Mock Backend

If the endpoint test failed:

1. **Stop the mock backend** (Ctrl+C in the terminal running it)

2. **Restart it**:
   ```bash
   cd vehicle-pos-pwa
   npm run backend
   ```

3. **Wait for the success message**:
   ```
   JSON Server is running on http://localhost:3000
   ```

4. **Test again**:
   ```bash
   curl http://localhost:3000/api/service-catalog
   ```

### Step 4: Hard Refresh the Browser

After confirming the backend is running:

1. **Mac**: Cmd + Shift + R
2. **Windows/Linux**: Ctrl + Shift + R

This clears the browser cache and reloads the page.

### Step 5: Check Browser Console

Open DevTools (F12) and check the Console tab:

**Look for these log messages:**
```
[ServiceTicketService] Getting service catalog from: http://localhost:3000/api/service-catalog
[ServiceTicketService] Fetching catalog from API...
[ServiceTicketService] Catalog loaded from API: {version: "1.0.0", serviceCount: 36, categoryCount: 8}
[TicketFormComponent] Service catalog loaded: {version: "1.0.0", ...}
```

**If you see error messages:**

- **"status: 0"** = Cannot connect to backend (backend not running or CORS issue)
- **"status: 404"** = Endpoint not found (wrong URL or backend not configured correctly)
- **"status: 500"** = Backend error (check backend terminal for errors)

## Common Issues

### Issue 1: Port 3000 Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find and kill the process using port 3000
# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Then restart
npm run backend
```

### Issue 2: Backend Starts But Endpoint Returns Empty

**Symptom**: `curl http://localhost:3000/api/service-catalog` returns `{}`

**Solution**: The db.json file might be corrupted or missing the service-catalog section.

1. Check if `mock-backend/db.json` has the `service-catalog` section
2. If missing or corrupted, restore from git:
   ```bash
   git checkout mock-backend/db.json
   ```
3. Restart backend

### Issue 3: CORS Error

**Symptom**: Browser console shows CORS error

**Solution**: This shouldn't happen with json-server, but if it does:

1. Stop the backend
2. Install cors middleware:
   ```bash
   npm install cors
   ```
3. Restart backend

### Issue 4: Wrong API URL

**Symptom**: Console shows wrong URL being called

**Check**: `src/environments/environment.ts` should have:
```typescript
apiBaseUrl: 'http://localhost:3000/api'
```

If different, update it and rebuild:
```bash
npm start
```

## Verification Steps

After fixing, verify everything works:

1. **Backend Running**: `curl http://localhost:3000/api/service-catalog` returns JSON
2. **Frontend Running**: http://localhost:4200 loads
3. **Login**: EMP001 / SecurePass123!
4. **Navigate**: Click "New Service Ticket"
5. **Check**: No error message, service catalog tabs visible
6. **Test**: Click "Oil Change" tab, see 6 services listed

## Still Not Working?

### Check All Logs

1. **Backend Terminal**: Look for errors when the API is called
2. **Browser Console**: Look for detailed error messages
3. **Network Tab**: Check the request to `/api/service-catalog`
   - Status code
   - Response body
   - Request headers

### Manual Test

Create a simple test file:

```bash
# test-catalog.sh
curl -v http://localhost:3000/api/service-catalog
```

Run it:
```bash
chmod +x test-catalog.sh
./test-catalog.sh
```

Look for:
- Connection successful
- HTTP 200 OK
- JSON response with services

### Last Resort: Clean Restart

1. Stop all servers (Ctrl+C in both terminals)
2. Clear node modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
3. Start backend: `npm run backend`
4. Start frontend: `npm start`
5. Hard refresh browser

## Success Indicators

You'll know it's working when:

✅ No error message on Create Service Ticket page
✅ Service category tabs visible (Oil Change, Filters, etc.)
✅ Clicking tabs shows services
✅ Can add services to ticket
✅ Pricing updates in real-time

## Need More Help?

Check these files:
- `SERVICE-TICKET-TESTING-GUIDE.md` - Complete testing guide
- `WHATS-NEW.md` - What was recently added
- `TESTING-INSTRUCTIONS.md` - Quick start guide

---

**Quick Fix**: 99% of the time, the issue is that the mock backend isn't running. Just run `npm run backend` in the vehicle-pos-pwa directory!
