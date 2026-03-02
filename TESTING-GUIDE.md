# 🧪 Testing Guide - Vehicle POS PWA

## ✅ Backend is Fixed and Working!

Both servers are now running correctly with proper API integration.

---

## 🌐 Access the Application

**Frontend URL:**
```
http://localhost:4200/
```

**Backend API URL:**
```
http://localhost:3000/
```

---

## 📋 Test Scenario 1: Search by Criteria

### Steps:
1. Open http://localhost:4200/ in your browser
2. In the "Vehicle Search" section:
   - **Year**: Select **2023**
   - **Make**: Select **Toyota**
   - **Model**: Select **Camry**
3. Click the **"Search"** button

### Expected Result:
You should see vehicle details displayed:
- **Year**: 2023
- **Make**: Toyota
- **Model**: Camry
- **Engine**: 2.5L 4-Cylinder
- **Oil Type**: 0W-20 Synthetic
- **Oil Capacity**: 4.8 quarts
- **Recommended Services**: Oil Change, Tire Rotation, Multi-Point Inspection, Air Filter Replacement
- **Service Interval**: 5,000 miles

---

## 🔍 Test Scenario 2: Search by VIN

### Steps:
1. Scroll to the "OR" section
2. In the **VIN** input field, enter: `1HGBH41JXMN109186`
3. Click **"Search"** or press **Enter**

### Expected Result:
Same vehicle details as above should be displayed (2023 Toyota Camry).

---

## 📶 Test Scenario 3: Offline Mode (PWA Capability)

### Steps to Test Offline Functionality:

#### Method 1: Using Chrome DevTools
1. Open the application: http://localhost:4200/
2. **First, search for a vehicle** (e.g., 2023 Toyota Camry) to cache the data
3. Open Chrome DevTools (Press **F12** or **Cmd+Option+I** on Mac)
4. Go to the **"Network"** tab
5. In the throttling dropdown (top of Network tab), select **"Offline"**
6. Try searching for the same vehicle again
7. **Expected**: Vehicle data loads from cache, "Offline" indicator shows in header

#### Method 2: Using Application Tab
1. Open Chrome DevTools (**F12**)
2. Go to **"Application"** tab
3. In the left sidebar, find **"Service Workers"**
4. Check the **"Offline"** checkbox
5. Try searching for a cached vehicle
6. **Expected**: Data loads from IndexedDB cache

#### Method 3: Disconnect Network
1. Search for a vehicle first (to cache it)
2. Disconnect your WiFi/Ethernet
3. Try searching for the same vehicle
4. **Expected**: Application shows "Offline" status, cached data is displayed

### What to Verify in Offline Mode:
- ✅ Header shows "Offline" status (red indicator)
- ✅ Previously searched vehicles load from cache
- ✅ "Last sync" timestamp is displayed
- ✅ Error message for uncached vehicles: "Vehicle not found in cache"

---

## 🗄️ Test Scenario 4: IndexedDB Inspection

### Steps:
1. Open Chrome DevTools (**F12**)
2. Go to **"Application"** tab
3. In the left sidebar, expand **"IndexedDB"**
4. Expand **"vehicle-pos-db"**
5. Click on **"vehicle-cache"** to see cached vehicles
6. Click on **"reference-data"** to see makes/models
7. Click on **"request-queue"** to see queued requests (if any)

### What to Check:
- **vehicle-cache**: Should contain vehicles you've searched for
- **reference-data**: Should contain makes, models, engines, service types
- **request-queue**: Should be empty when online, may contain failed requests when offline

---

## 🔄 Test Scenario 5: Request Retry Queue

### Steps:
1. Open the application
2. Open Chrome DevTools → Network tab
3. Set throttling to **"Offline"**
4. Try to search for a NEW vehicle (not in cache)
5. **Expected**: Error message appears, request is queued
6. Set throttling back to **"Online"**
7. **Expected**: Queued request automatically retries and succeeds

### Verification:
- Check browser console for retry messages
- Check IndexedDB → request-queue (should be empty after successful retry)

---

## 📊 All Available Test Data

### Test Vehicles by Criteria:

| Year | Make | Model | VIN |
|------|------|-------|-----|
| 2023 | Toyota | Camry | 1HGBH41JXMN109186 |
| 2022 | Toyota | Corolla | 2T1BURHE5JC123456 |
| 2023 | Toyota | RAV4 | 2T3ZFREV5JW123789 |
| 2023 | Honda | Accord | 1HGCV1F36JA123456 |
| 2022 | Honda | Civic | 2HGFC2F59JH123456 |
| 2023 | Honda | CR-V | 5J6RW2H85JA123456 |
| 2023 | Ford | F-150 | 1FTFW1E85JFA12345 |
| 2022 | Ford | Escape | 1FMCU9GD5JUA12345 |
| 2023 | Ford | Explorer | 1FM5K8GC5JGA12345 |
| 2023 | Chevrolet | Silverado | 1GCUYEED5JZ123456 |
| 2022 | Chevrolet | Equinox | 2GNAXUEV5J6123456 |
| 2023 | Chevrolet | Malibu | 1G1ZD5ST5JF123456 |

---

## 🧪 Advanced Testing

### Test Network Status Indicator
1. Watch the header while toggling online/offline
2. **Online**: Green dot + "Online"
3. **Offline**: Red dot + "Offline" + "Last sync: X minutes ago"

### Test LRU Cache Eviction
1. Search for 100+ different vehicles
2. Check IndexedDB → vehicle-cache
3. **Expected**: Only last 100 vehicles are cached (oldest evicted)

### Test Reference Data Caching
1. Load the app (reference data is fetched)
2. Go offline
3. Refresh the page
4. **Expected**: Dropdowns still populate from cached reference data

---

## 🐛 Troubleshooting

### Dropdowns Not Populating?
**Check:**
1. Backend is running: `curl http://localhost:3000/api/vehicles/reference-data`
2. Browser console for errors (F12 → Console tab)
3. Network tab shows successful API call to `/api/vehicles/reference-data`

**Fix:**
```bash
# Restart backend
cd vehicle-pos-pwa
node mock-backend/server.js
```

### Search Not Working?
**Check:**
1. Backend API: `curl "http://localhost:3000/api/vehicles?year=2023&make=Toyota&model=Camry"`
2. Browser console for errors
3. Network tab shows API call

### Offline Mode Not Working?
**Check:**
1. Service Worker is registered: DevTools → Application → Service Workers
2. Data was cached before going offline
3. IndexedDB has cached data: DevTools → Application → IndexedDB

### Clear All Data and Start Fresh:
```javascript
// In browser console (F12 → Console):
indexedDB.deleteDatabase('vehicle-pos-db');
// Then refresh the page
```

---

## ✅ Success Checklist

After testing, you should have verified:

- [ ] Frontend loads at http://localhost:4200/
- [ ] Backend API responds at http://localhost:3000/
- [ ] Dropdowns populate with makes/models
- [ ] Search by criteria works (Year/Make/Model)
- [ ] Search by VIN works
- [ ] Vehicle details display correctly
- [ ] Offline mode works (cached data accessible)
- [ ] Network status indicator updates
- [ ] IndexedDB stores cached data
- [ ] Request retry queue works
- [ ] Service Worker is registered

---

## 🎯 Quick Test Commands

### Test Backend Endpoints:
```bash
# Reference data
curl http://localhost:3000/api/vehicles/reference-data | jq

# Search by VIN
curl http://localhost:3000/api/vehicles/1HGBH41JXMN109186 | jq

# Search by criteria
curl "http://localhost:3000/api/vehicles?year=2023&make=Toyota&model=Camry" | jq
```

### Check Running Servers:
```bash
# Check processes
lsof -i :4200  # Frontend
lsof -i :3000  # Backend

# Or
ps aux | grep -E "(ng serve|node.*server.js)"
```

---

## 📝 Notes

- **First Load**: Reference data is fetched and cached automatically
- **Subsequent Loads**: Reference data loads from cache (faster)
- **Cache Duration**: 24 hours for reference data
- **Max Cached Vehicles**: 100 (LRU eviction)
- **Request Queue**: Failed requests retry automatically when online

---

## 🎉 You're Ready to Test!

Start with **Test Scenario 1** (Search by Criteria) and work your way through all scenarios to fully test the PWA capabilities!

**Happy Testing! 🚗💨**
