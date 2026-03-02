# Service Ticket Management - Testing Guide

## How to Test the Service Ticket Flow

### Prerequisites

Make sure all servers are running:

```bash
# Terminal 1 - Development Server
cd vehicle-pos-pwa
npm start
# Runs on http://localhost:4200

# Terminal 2 - Mock Backend
cd vehicle-pos-pwa
npm run backend
# Runs on http://localhost:3000
```

### Step-by-Step Testing Flow

#### 1. Login
- Navigate to: http://localhost:4200
- Use test credentials:
  - **Technician**: EMP001 / SecurePass123!
  - **Manager**: EMP002 / Manager@2024
- Click "Login"
- You should be redirected to the home page

#### 2. Navigate to Service Ticket Creation
- On the home page, click the **"New Service Ticket"** card (first card in Primary Actions)
- OR use the header navigation: Click the Valvoline logo → Home, then click "New Service Ticket"
- You should see the ticket creation form at `/tickets/new`

#### 3. Test the Ticket Form

**What You Should See:**
- Customer selection dropdown
- Vehicle selection dropdown (disabled until customer selected)
- Current mileage input
- Service recommendations panel
- Service catalog with 8 category tabs:
  - Oil Change
  - Fluid Services
  - Filters
  - Battery
  - Wipers
  - Lights
  - Tires
  - Inspection
- Selected services table
- Pricing summary (subtotal, tax, total)
- Parts/Labor breakdown
- Discount section
- Technician assignment
- Create Ticket button

**Current Limitations (Expected):**
- Service catalog will show "No services available" because mock backend doesn't have catalog data yet (Task 33)
- Customer dropdown will be empty if no customers exist in mock backend
- Recommendations panel will be empty without service history

#### 4. Create a Test Customer First (If Needed)

If you don't have customers:
1. Click the Valvoline logo (home icon) in header
2. Click "Customer Lookup" card
3. Click "Add New Customer" button
4. Fill in the form:
   - First Name: John
   - Last Name: Doe
   - Phone: 555-123-4567
   - Email: john.doe@example.com
   - Address (optional)
5. Add a vehicle:
   - VIN: 1HGBH41JXMN109186
   - Year: 2020
   - Make: Honda
   - Model: Accord
6. Click "Save Customer"

#### 5. Test Ticket Creation Flow

1. **Select Customer**
   - Click customer dropdown
   - Select "John Doe" (or your test customer)
   - Vehicle dropdown should become enabled

2. **Select Vehicle**
   - Click vehicle dropdown
   - Select the customer's vehicle
   - Vehicle details should populate

3. **Enter Mileage**
   - Enter current mileage (e.g., 45000)
   - Recommendations should update (if service history exists)

4. **Add Services** (NOW WORKING!)
   - Click on category tabs to browse services:
     - Oil Change: 6 options (Conventional $39.99 to European $99.99)
     - Fluid Services: 6 options (Windshield $9.99 to Transmission $179.99)
     - Filters: 4 options ($19.99 to $79.99)
     - Battery: 4 options (Free test to Premium $199.99)
     - Wipers: 3 options ($19.99 to $49.99)
     - Lights: 5 options ($19.99 to $79.99)
     - Tires: 4 options (Free checks to Balance $59.99)
     - Inspection: 4 options (Free to Diagnostic $49.99)
   - Click any service to add it to the ticket
   - Services appear in "Selected Services" table
   - Adjust quantity using +/- buttons
   - Remove services with trash icon

5. **View Pricing**
   - Pricing summary updates in real-time:
     - Subtotal: Sum of all services
     - Tax (8.25%): Calculated on subtotal
     - Total: Subtotal + Tax
   - Parts/Labor breakdown visible
   - Example: Full Synthetic Oil Change ($79.99) + Engine Air Filter ($39.99) = $119.98 + $9.90 tax = $129.88 total

6. **Assign Technician** (Optional)
   - Select technician from dropdown
   - Estimated completion time displays

7. **Apply Discount** (Optional)
   - Enter discount percentage or amount
   - Enter reason
   - Manager approval indicator shows if >10%

8. **Create Ticket**
   - Click "Create Ticket" button
   - Success! Ticket is created and saved
   - You'll see a success message
   - Ticket is stored in mock backend database
   - Currently no redirect (Task 19-20 needed for ticket list/detail views)

### What's Working Now

✅ **Navigation**
- Home → New Service Ticket works
- Header navigation works
- Back button works

✅ **Form Structure**
- All form fields render correctly
- Customer/vehicle selection dropdowns work
- Mileage input works
- Category tabs render
- Pricing calculations work (when services added)

✅ **Service Catalog** (NOW AVAILABLE!)
- 36 services across 8 categories
- Oil Change (6 services)
- Fluid Services (6 services)
- Filters (4 services)
- Battery (4 services)
- Wipers (3 services)
- Lights (5 services)
- Tires (4 services)
- Inspection (4 services)

✅ **Validation**
- Customer required validation
- Vehicle required validation
- At least one service required validation
- Mileage validation (positive integer)

✅ **Real-time Updates**
- Vehicle selection updates form
- Mileage changes trigger recommendation updates
- Service additions trigger pricing recalculation

✅ **Ticket Creation**
- Can now add services from catalog
- Can create complete tickets
- Tickets saved to mock backend
- Real-time pricing with tax calculation

### What's Not Working Yet (Expected)

❌ **Service Recommendations** (Needs Service History)
- Recommendations panel empty without service history
- Needs completed tickets in database

❌ **Ticket List View** (Task 19)
- No way to view created tickets yet
- No ticket search/filter functionality

❌ **Ticket Detail View** (Task 20)
- Cannot view ticket details
- Cannot edit existing tickets
- Cannot change ticket status

### Browser Console Checks

Open browser DevTools (F12) and check:

1. **Console Tab**
   - Should see: `[TicketFormComponent] Component initialized`
   - Should see: `[ServiceTicketService] Service initialized`
   - No red errors (warnings are OK)

2. **Network Tab**
   - When selecting customer: `GET http://localhost:3000/customers`
   - When loading catalog: `GET http://localhost:3000/service-catalog`
   - 404 errors for catalog are expected (not implemented yet)

3. **Application Tab → IndexedDB**
   - Database: `valvoline-pos-db`
   - Object Stores:
     - customers
     - vehicles
     - service-catalog (empty)
     - service-tickets (empty)
     - ticket-queue (empty)

### Testing Offline Functionality

1. **Go Offline**
   - Open DevTools (F12)
   - Go to Network tab
   - Check "Offline" checkbox
   - OR use Application tab → Service Workers → Offline

2. **Test Offline Behavior**
   - Try to create a ticket
   - Should queue operation for sync
   - Check IndexedDB → ticket-queue for queued operations

3. **Go Back Online**
   - Uncheck "Offline"
   - Operations should sync automatically

### Hard Refresh (If Changes Don't Appear)

If you made code changes and don't see them:

**Mac**: Cmd + Shift + R
**Windows/Linux**: Ctrl + Shift + R

This clears the browser cache and reloads.

## Next Steps to Complete the Flow

To have a fully working ticket management system, you still need:

1. **Task 19** - Implement TicketListComponent
   - View all created tickets
   - Search and filter tickets
   - Navigate to ticket details

2. **Task 20** - Implement TicketDetailComponent
   - View complete ticket information
   - Edit tickets (Created/In_Progress only)
   - Change status (Start Work, Complete, Mark Paid)
   - Print work orders

3. **Tasks 21-25** - Additional UI components
   - Standalone service catalog component
   - Recommendation panel component
   - Technician selector component
   - Ticket summary component
   - Work order print component

## What You Can Test Right Now

✅ **Complete Ticket Creation Flow**:
1. Login with EMP001 / SecurePass123!
2. Click "New Service Ticket"
3. Select customer (or create new one first)
4. Select vehicle
5. Enter mileage
6. Browse service catalog by category
7. Add multiple services
8. Watch pricing update in real-time
9. Optionally assign technician
10. Optionally apply discount
11. Click "Create Ticket"
12. Success! Ticket is saved

✅ **Test Different Scenarios**:
- Add oil change + filters (common combo)
- Add free services (battery test, tire pressure check)
- Add expensive services (transmission fluid, European oil change)
- Apply discounts and see manager approval indicator
- Test with different customers and vehicles

✅ **Verify in Browser DevTools**:
- Network tab: See POST to `/api/tickets`
- Application tab → IndexedDB → tickets: See saved tickets
- Console: No errors (warnings OK)

## Troubleshooting

### Issue: "Cannot read property of undefined"
- **Solution**: Make sure mock backend is running on port 3000
- Check: `curl http://localhost:3000/customers`

### Issue: Dropdowns are empty
- **Solution**: Create test customers first using Customer Management
- Navigate to: Home → Customer Lookup → Add New Customer

### Issue: "No services available"
- **Solution**: ✅ FIXED! Restart mock backend server
- Run: `npm run backend` in vehicle-pos-pwa directory
- Service catalog now has 36 services across 8 categories

### Issue: Form validation errors
- **Solution**: ✅ Now you can add services!
- Customer, vehicle, and at least one service are required
- Add services from the catalog tabs
- Create ticket button will work once all required fields are filled

### Issue: Changes not appearing
- **Solution**: Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
- Clear browser cache
- Restart dev server

## Current Implementation Status

**Completed**: Tasks 1-18 + Task 33 (Service Catalog) = 53% of total
- ✅ Core infrastructure and data models
- ✅ Validation service
- ✅ Cache repositories with LRU eviction
- ✅ Pricing calculation engine
- ✅ Service ticket service (CRUD operations)
- ✅ Recommendation engine
- ✅ Technician assignment
- ✅ Work order generation
- ✅ Ticket form component
- ✅ **Service catalog with 36 services**
- ✅ **Mock backend endpoints for tickets**
- ✅ **Complete ticket creation flow working**

**Remaining**: Tasks 19-32, 34-36 (47% of total)
- ⏳ Ticket list component
- ⏳ Ticket detail component
- ⏳ Additional UI components
- ⏳ Manager approval workflow
- ⏳ Integration testing

---

**Last Updated**: After adding service catalog and ticket endpoints
**Build Status**: ✅ All TypeScript compiles without errors
**Ready for Testing**: ✅ Yes - Full ticket creation flow is working!
**Service Catalog**: ✅ 36 services across 8 categories
**Mock Backend**: ✅ All endpoints implemented
