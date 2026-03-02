# Appointment Form - Service Selection & Time Slot Fix

## Issues Fixed

### 1. Service Selection Not Working
**Problem**: Service checkboxes were not displaying or not responding to clicks.

**Root Cause**: 
The `ServiceTypeService.getServiceTypes()` method had a broken RxJS Observable chain that was returning `Observable<Observable<ServiceType[]>>` instead of `Observable<ServiceType[]>`. This caused the service types array to never be populated correctly.

**Solution**:
- Fixed the Observable chain in `ServiceTypeService.getServiceTypes()` to use `switchMap` instead of nested `map` operators
- Fixed the same issue in `getServiceTypeById()` method
- Added `switchMap` to the RxJS imports

**Code Changes**:
```typescript
// BEFORE (broken):
getServiceTypes(): Observable<ServiceType[]> {
  return from(this.ensureCacheInitialized()).pipe(
    map(() => this.getAll<ServiceType>(this.STORE_NAME)),
    map(promise => from(promise)),
    map(observable => observable),  // This creates nested Observable!
    catchError(error => {
      console.error('Error getting service types:', error);
      return of(SERVICE_TYPES);
    })
  ) as Observable<ServiceType[]>;
}

// AFTER (fixed):
getServiceTypes(): Observable<ServiceType[]> {
  return from(this.ensureCacheInitialized()).pipe(
    switchMap(() => from(this.getAll<ServiceType>(this.STORE_NAME))),
    catchError(error => {
      console.error('Error getting service types:', error);
      return of(SERVICE_TYPES);
    })
  );
}
```

### 2. Time Selection Not Working
**Problem**: Time dropdown was not populating with available time slots.

**Root Cause**: 
The time slots depend on:
1. Service types being loaded (to calculate total duration)
2. A date being selected
3. At least one service being selected

If service types weren't loading due to the Observable issue, the duration would always be 0, and no time slots would be generated.

**Solution**:
- Fixed the service type loading (see above)
- Added console logging to track the flow
- Time slots now load correctly when:
  - User selects services (duration > 0)
  - User selects a date
  - Both conditions are met

## How It Works Now

### Service Selection Flow:
1. Component loads and calls `loadServiceTypes()`
2. Service types are fetched from IndexedDB (or predefined data if cache is empty)
3. Services are grouped by category and displayed
4. User clicks a checkbox
5. `toggleServiceType()` is called
6. Service is added/removed from `selectedServiceTypes[]`
7. `calculateDuration()` recalculates total duration
8. If a date is selected, time slots are refreshed

### Time Slot Selection Flow:
1. User selects one or more services (duration > 0)
2. User selects a date
3. `loadAvailableTimeSlots()` is called
4. Time slots are generated in 30-minute intervals
5. Each slot checks for bay availability
6. Available slots are displayed in the dropdown

## Debugging

### Check Browser Console
Open the browser console (F12) and look for these log messages:

**Service Loading:**
```
[AppointmentForm] Loading service types...
[AppointmentForm] Service types loaded: 23 [Array]
```

**Category Filtering:**
```
[AppointmentForm] Service types for category Oil Change : 4
[AppointmentForm] Service types for category Fluid Service : 5
```

**Service Selection:**
```
[AppointmentForm] Toggle service type: Conventional Oil Change
[AppointmentForm] Added service, total selected: 1
```

**Time Slot Loading:**
```
[AppointmentForm] Loading time slots for date: Thu Feb 27 2026... duration: 30
[AppointmentForm] Time slots loaded: 16
```

### Common Issues

**No services showing:**
- Check console for "Service types loaded" message
- If you see an error, check IndexedDB permissions
- Clear browser cache and reload

**Checkboxes not responding:**
- Check console for "Toggle service type" messages
- If no messages appear, there may be a JavaScript error
- Check that the checkbox event binding is working

**No time slots available:**
- Ensure at least one service is selected (duration > 0)
- Ensure a date is selected
- Check console for "Time slots loaded" message
- If 0 slots are loaded, the selected date may be outside business hours

## Testing

### Test Service Selection:
1. Open Schedule Appointment page
2. Open browser console (F12)
3. Scroll to "Select Services" section
4. Click a checkbox (e.g., "Conventional Oil Change")
5. Verify console shows:
   ```
   [AppointmentForm] Toggle service type: Conventional Oil Change
   [AppointmentForm] Added service, total selected: 1
   ```
6. Verify "Total Duration" appears at the bottom
7. Click the same checkbox again
8. Verify console shows:
   ```
   [AppointmentForm] Toggle service type: Conventional Oil Change
   [AppointmentForm] Removed service, total selected: 0
   ```

### Test Time Selection:
1. Select a customer
2. Select a vehicle
3. Select one or more services
4. Select a date (today or future)
5. Verify console shows:
   ```
   [AppointmentForm] Loading time slots for date: ...
   [AppointmentForm] Time slots loaded: 16
   ```
6. Click the Time dropdown
7. Verify time slots are displayed (e.g., "08:00 AM (4 bays available)")

### Test Complete Flow:
1. Select customer: "Michael Johnson"
2. Select vehicle: "2023 Toyota Camry"
3. Select service: "Conventional Oil Change"
4. Verify "Total Duration: 30m" appears
5. Select date: Tomorrow
6. Verify time dropdown enables
7. Select time: "09:00 AM"
8. Verify "Estimated End Time" appears
9. Select bay: "Bay 1"
10. Select technician: "John Smith"
11. Click "Create Appointment"
12. Verify success message

## Files Modified

1. **service-type.service.ts**
   - Fixed `getServiceTypes()` Observable chain
   - Fixed `getServiceTypeById()` Observable chain
   - Added `switchMap` import

2. **appointment-form.component.ts**
   - Added console logging to `loadServiceTypes()`
   - Added console logging to `getServiceTypesForCategory()`
   - Added console logging to `toggleServiceType()`
   - Added console logging to `loadAvailableTimeSlots()`

## Technical Details

### RxJS Observable Chain Issue
The problem was using `map` to convert a Promise to an Observable, which created a nested Observable structure:

```typescript
// This creates Observable<Observable<T>>:
map(() => this.getAll<ServiceType>(this.STORE_NAME))  // Returns Promise<T>
map(promise => from(promise))                          // Converts to Observable<T>
map(observable => observable)                          // Returns Observable<T>, but we're inside a map!
```

The correct approach is to use `switchMap` which flattens the nested Observable:

```typescript
// This creates Observable<T>:
switchMap(() => from(this.getAll<ServiceType>(this.STORE_NAME)))
```

### Service Type Categories
Services are grouped by these categories:
- Oil Change (4 services)
- Fluid Service (5 services)
- Filter Service (3 services)
- Battery (2 services)
- Wiper (1 service)
- Light (2 services)
- Tire (2 services)
- Inspection (2 services)

### Time Slot Generation
- Slots are generated in 30-minute intervals
- Store hours: 8:00 AM - 6:00 PM (Mon-Sat), Closed (Sun)
- Each slot checks for bay availability (4 bays total)
- Buffer time of 15 minutes is added between appointments

## Status
✅ Service selection working
✅ Time slot selection working
✅ Duration calculation working
✅ Console logging added for debugging
✅ All compilation errors resolved
