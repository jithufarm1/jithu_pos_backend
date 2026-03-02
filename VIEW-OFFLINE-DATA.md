# How to View Offline Data - Client Demo Guide

## Quick Access to View Stored Data

### Option 1: Chrome DevTools (Best for Technical Demo)

1. **Open the Application** (http://localhost:4200)

2. **Open Chrome DevTools**
   - Press `F12` (Windows/Linux) or `Cmd+Option+I` (Mac)
   - Or right-click anywhere → "Inspect"

3. **Navigate to Application Tab**
   - Click "Application" tab at the top of DevTools
   - If you don't see it, click the ">>" icon to find it

4. **View IndexedDB Storage**
   - Left sidebar → Expand "Storage"
   - Expand "IndexedDB"
   - Expand "valvoline-pos-db"
   
5. **Click on Any Store to See Data:**
   - **customers** - All customer records (names, phones, emails, vehicles)
   - **vehicles** - Vehicle cache data
   - **service-catalog** - All available services
   - **tickets** - Service tickets created
   - **appointments** - Scheduled appointments
   - **request-queue** - Pending operations (when offline)

### Option 2: Storage Overview

1. In DevTools → Application tab
2. Click "Storage" in left sidebar
3. See storage usage:
   - Total storage used
   - Available quota
   - Breakdown by type (IndexedDB, LocalStorage, etc.)

### Option 3: Network Tab (Show Offline Capability)

1. **Open DevTools** → "Network" tab

2. **Enable Offline Mode**
   - Check the "Offline" checkbox at the top
   - Or click "No throttling" → "Offline"

3. **Navigate the App**
   - Browse customers
   - View service catalog
   - View appointments
   - Everything still works!

4. **Show Network Requests**
   - All requests show "(from disk cache)" or "(from ServiceWorker)"
   - No actual network calls being made

## Demo Script for Client

### 1. Show Data Download
```
1. Navigate to "Data Management" page
2. Click "Download All Data"
3. Show progress bar as data downloads
4. Show success message
```

### 2. Prove Data is Stored Locally
```
1. Open DevTools (F12)
2. Go to Application → IndexedDB → valvoline-pos-db
3. Click on "customers" store
4. Show actual customer records stored in browser
5. Click on "service-catalog" store
6. Show all services stored locally
```

### 3. Demonstrate Offline Functionality
```
1. Keep DevTools open
2. Go to Network tab
3. Check "Offline" checkbox
4. Navigate to Customers page
5. Show customers loading instantly (from cache)
6. Navigate to Service Catalog
7. Show services loading (from cache)
8. Create a new ticket
9. Show it's queued for sync
```

### 4. Show Storage Usage
```
1. DevTools → Application → Storage
2. Show total storage used
3. Explain: "All this data is stored on your device"
4. Explain: "Works even without internet"
```

## Key Points to Emphasize

✅ **No Internet Required** - All data stored locally in browser
✅ **Fast Performance** - Instant loading from local storage
✅ **Automatic Sync** - Changes sync when back online
✅ **Secure Storage** - Data encrypted in browser
✅ **Large Capacity** - Can store 100s of MB of data

## Storage Locations

The app stores data in multiple browser storage mechanisms:

1. **IndexedDB** (Main storage)
   - Database: `valvoline-pos-db`
   - Stores: customers, vehicles, tickets, appointments, service-catalog, request-queue

2. **LocalStorage** (Settings & Auth)
   - `pos_auth_state` - Authentication token
   - `pos_cache_settings` - Cache configuration
   - `pos_sync_status` - Sync status

3. **Service Worker Cache** (App files)
   - HTML, CSS, JavaScript files
   - Images and assets
   - Enables offline app loading

## Troubleshooting

**If data doesn't appear:**
1. Make sure you clicked "Download All Data"
2. Wait for download to complete
3. Refresh DevTools (close and reopen)
4. Check browser console for errors

**To clear all data:**
1. DevTools → Application → Storage
2. Click "Clear site data" button
3. Refresh the page
