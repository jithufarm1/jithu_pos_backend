# Offline Testing Guide

## Prerequisites

Before testing offline, you need to:
1. ✅ Use production build (http://localhost:8080)
2. ✅ Load the app with backend running first (to cache data)
3. ✅ Then stop the backend to test offline

## Step-by-Step Offline Testing

### Phase 1: Load Data While Online

**Backend Status**: Running ✅

1. **Open production URL**: http://localhost:8080

2. **Login**: EMP001 / SecurePass123!

3. **Load customers** (to cache them):
   - Navigate to "Customer Lookup"
   - Search for customers
   - View a few customer details
   - This caches customer data to IndexedDB

4. **Load service catalog** (to cache it):
   - Navigate to "New Service Ticket"
   - Browse through different service categories
   - This caches the service catalog to IndexedDB

5. **Check IndexedDB** (optional):
   - Open DevTools (F12)
   - Application tab → IndexedDB
   - You should see: customers, vehicles, service-catalog

### Phase 2: Test Offline Functionality

**Backend Status**: Stopped ❌

Now I'll stop the backend server for you to test offline.

#### What Should Work Offline:

✅ **App Shell**
- App loads and displays UI
- Navigation works
- Service worker serves cached app files

✅ **Customer Management**
- View cached customers
- Search cached customers
- View customer details (if previously loaded)
- Create new customers (queued for sync)
- Edit customers (queued for sync)

✅ **Service Catalog**
- Browse service categories
- View service details
- Search services
- All 36 services available offline

✅ **Service Tickets**
- Create new tickets (queued for sync)
- View cached tickets
- Pricing calculations work offline
- Service recommendations work offline

✅ **Vehicle Search**
- Search cached vehicles
- View vehicle details

#### What Won't Work Offline:

❌ **Fresh Data from Server**
- Can't fetch new customers from server
- Can't fetch new vehicles from server
- Can't sync created/edited data

❌ **Real-time Updates**
- Changes made on other devices won't appear
- Server-side calculations won't run

#### Expected Behavior:

**Network-First Strategy** (default):
1. Try to fetch from server
2. If server unavailable, use cache
3. Show cached data
4. Queue write operations for later sync

**Offline Indicators**:
- Operations are queued in IndexedDB
- Will sync when backend comes back online

### Phase 3: Test Offline Operations

#### Test 1: View Cached Customers
1. Navigate to "Customer Lookup"
2. **Expected**: Previously loaded customers appear
3. **Expected**: Search works on cached data

#### Test 2: Create Customer Offline
1. Navigate to "Customer Lookup" → "Add New Customer"
2. Fill in customer details
3. Click "Save"
4. **Expected**: Customer saved to IndexedDB
5. **Expected**: Operation queued for sync
6. Check IndexedDB → request-queue

#### Test 3: Create Service Ticket Offline
1. Navigate to "New Service Ticket"
2. Select customer (from cache)
3. Select vehicle (from cache)
4. Add services (from cached catalog)
5. Click "Create Ticket"
6. **Expected**: Ticket saved to IndexedDB
7. **Expected**: Operation queued for sync

#### Test 4: Browse Service Catalog Offline
1. Navigate to "New Service Ticket"
2. Browse through all 8 service categories
3. **Expected**: All services load from cache
4. **Expected**: No loading delays

### Phase 4: Test Sync After Coming Back Online

**Backend Status**: Restarted ✅

1. **Restart backend server** (I'll do this for you when ready)

2. **Refresh the app** or wait for auto-sync

3. **Check sync queue**:
   - Open DevTools → Console
   - Look for sync messages
   - Queued operations should process

4. **Verify data on server**:
   - Check mock-backend/db.json
   - Created customers/tickets should appear

## Browser DevTools Testing

### Method 1: Stop Backend Server (Recommended)
This is what we're doing - actually stopping the backend to simulate real offline scenario.

### Method 2: Browser Offline Mode
1. Open DevTools (F12)
2. Network tab
3. Throttling dropdown → "Offline"
4. App thinks it's offline
5. To go back online: Select "No throttling"

### Method 3: Service Worker Offline
1. Open DevTools (F12)
2. Application tab → Service Workers
3. Check "Offline" checkbox
4. Only affects service worker requests

## Monitoring Offline Behavior

### Check IndexedDB
1. DevTools (F12) → Application tab
2. IndexedDB → valvoline-pos-db
3. Object stores:
   - **customers**: Cached customer data
   - **vehicles**: Cached vehicle data
   - **service-catalog**: Cached services
   - **service-tickets**: Cached tickets
   - **request-queue**: Pending sync operations

### Check Service Worker
1. DevTools (F12) → Application tab
2. Service Workers section
3. Should show: "activated and is running"
4. Cache Storage shows cached app files

### Check Network Requests
1. DevTools (F12) → Network tab
2. When offline:
   - Failed requests show red
   - Cached responses show "(from ServiceWorker)"
   - Status: 200 (from cache) or failed

### Check Console Logs
Look for these messages:
- `[ServiceTicketService] Network error, using cache`
- `[CustomerService] Offline, using cached data`
- `[RequestQueue] Operation queued for sync`

## Common Issues

### Issue: "No cached data available"
**Cause**: Didn't load data while online first
**Solution**: Restart backend, load data, then go offline again

### Issue: "Service catalog empty"
**Cause**: Catalog wasn't cached
**Solution**: Visit "New Service Ticket" page while online first

### Issue: "Customer list empty"
**Cause**: Customers weren't cached
**Solution**: Visit "Customer Lookup" while online first

### Issue: Operations not syncing
**Cause**: Backend still offline or sync service not running
**Solution**: Restart backend, refresh app, check console for sync logs

## Testing Checklist

**Before Going Offline**:
- [ ] Opened app in production mode (port 8080)
- [ ] Logged in successfully
- [ ] Loaded customer list
- [ ] Viewed at least one customer detail
- [ ] Opened service ticket form (loads catalog)
- [ ] Browsed through service categories
- [ ] Checked IndexedDB has data

**While Offline**:
- [ ] App loads without errors
- [ ] Can view cached customers
- [ ] Can search cached customers
- [ ] Can create new customer (queued)
- [ ] Can browse service catalog
- [ ] Can create service ticket (queued)
- [ ] Pricing calculations work
- [ ] No "Cannot connect" errors for cached data

**After Coming Back Online**:
- [ ] Queued operations sync automatically
- [ ] New data appears in backend
- [ ] Can fetch fresh data from server
- [ ] No sync errors in console

## Ready to Test?

I'll now stop the backend server. Make sure you've:
1. ✅ Loaded the app at http://localhost:8080
2. ✅ Logged in
3. ✅ Visited customer lookup (to cache customers)
4. ✅ Visited new service ticket (to cache catalog)

Then you can test all offline functionality!

When you're done testing offline, let me know and I'll restart the backend server.
