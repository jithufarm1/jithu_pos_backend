# 🔴 OFFLINE MODE ACTIVE

**Backend Server**: STOPPED ❌
**Date**: February 27, 2026

## Current Server Status

✅ **Dev Server** (Port 4200)
- Status: Running
- URL: http://localhost:4200

✅ **Production Server** (Port 8080)
- Status: Running
- URL: http://localhost:8080

❌ **Mock Backend** (Port 3000)
- Status: STOPPED
- API endpoints unavailable

## Testing Offline Functionality

### Before You Start

Make sure you've already done these steps WHILE ONLINE:
1. Opened http://localhost:8080
2. Logged in (EMP001 / SecurePass123!)
3. Visited "Customer Lookup" to cache customers
4. Visited "New Service Ticket" to cache service catalog

If you haven't done these, the app won't have cached data to work with offline.

### What to Test Now

#### ✅ Should Work Offline:

1. **App Shell**
   - Navigate between pages
   - UI loads and displays correctly

2. **View Cached Data**
   - Customer list (if previously loaded)
   - Customer details (if previously viewed)
   - Service catalog (if previously loaded)
   - Vehicle search (if previously loaded)

3. **Create Operations (Queued)**
   - Create new customer → Saved to IndexedDB, queued for sync
   - Create service ticket → Saved to IndexedDB, queued for sync
   - Edit customer → Changes queued for sync

4. **Calculations**
   - Service ticket pricing calculations
   - Tax calculations
   - Service recommendations

#### ❌ Won't Work Offline:

1. **Fresh Server Data**
   - Can't fetch new customers from server
   - Can't fetch new vehicles from server
   - Search only works on cached data

2. **Sync Operations**
   - Queued operations won't sync until backend is back
   - No real-time updates

### How to Test

1. **Open production URL**: http://localhost:8080

2. **Try viewing cached customers**:
   - Go to "Customer Lookup"
   - Should see previously loaded customers
   - Search should work on cached data

3. **Try creating a customer**:
   - Click "Add New Customer"
   - Fill in details
   - Click "Save"
   - Should save to IndexedDB
   - Check DevTools → Application → IndexedDB → request-queue

4. **Try creating a service ticket**:
   - Go to "New Service Ticket"
   - Select customer (from cache)
   - Select vehicle (from cache)
   - Browse service catalog (from cache)
   - Add services
   - Click "Create Ticket"
   - Should save to IndexedDB and queue for sync

5. **Check IndexedDB**:
   - Open DevTools (F12)
   - Application tab → IndexedDB → valvoline-pos-db
   - Check object stores:
     - customers (cached data)
     - service-catalog (cached services)
     - service-tickets (cached tickets)
     - request-queue (pending operations)

### Expected Behavior

**Network Requests**:
- Will fail with network errors
- App falls back to cached data
- Console shows: "Network error, using cache"

**Write Operations**:
- Saved to IndexedDB
- Added to sync queue
- Will sync when backend restarts

**User Experience**:
- App continues to work
- No crashes or blank screens
- Cached data displays normally
- New operations are queued

## Monitoring Offline Behavior

### Check Console Logs
Open DevTools (F12) → Console tab

Look for messages like:
```
[CustomerService] Network error, using cached data
[ServiceTicketService] Offline, queueing operation
[RequestQueue] Operation queued: create-customer
```

### Check Network Tab
Open DevTools (F12) → Network tab

You'll see:
- Failed requests (red, status: failed)
- Cached responses (from ServiceWorker)
- No successful API calls to port 3000

### Check IndexedDB
Open DevTools (F12) → Application → IndexedDB

Verify:
- Cached data exists in object stores
- request-queue has pending operations
- Data persists across page refreshes

## When You're Done Testing

Let me know when you're ready, and I'll restart the backend server so you can test:
1. Automatic sync of queued operations
2. Fresh data fetching
3. Full online functionality

## Restart Backend Command

When ready, I'll run:
```bash
node mock-backend/server.js
```

This will:
- Restart the API server on port 3000
- Allow queued operations to sync
- Enable fresh data fetching

## Quick Reference

**Current URLs**:
- Production: http://localhost:8080 ✅
- Dev: http://localhost:4200 ✅
- Backend: http://localhost:3000 ❌ (STOPPED)

**Test Credentials**:
- Technician: EMP001 / SecurePass123!
- Manager: EMP002 / Manager@2024

**What's Cached** (if you loaded it while online):
- Customers
- Vehicles
- Service catalog (36 services)
- Service tickets

**What's Queued** (operations you do offline):
- Customer create/edit
- Service ticket create
- Vehicle create/edit

Happy offline testing! 🔴
