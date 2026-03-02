# Quick Testing Instructions

## Start the Application

### Terminal 1 - Development Server
```bash
cd vehicle-pos-pwa
npm start
```
Wait for: `✔ Compiled successfully`
Access at: http://localhost:4200

### Terminal 2 - Mock Backend
```bash
cd vehicle-pos-pwa
npm run backend
```
Wait for: `JSON Server is running on http://localhost:3000`

## Test the Service Ticket Flow

### 1. Login
- Go to: http://localhost:4200
- Username: `EMP001`
- Password: `SecurePass123!`
- Click "Login"

### 2. Create Service Ticket
- Click "New Service Ticket" card on home page
- OR click Valvoline logo → Home → New Service Ticket

### 3. Fill Out Ticket Form

**Select Customer:**
- Click customer dropdown
- Choose "Michael Johnson" or any existing customer
- (If no customers, create one first via Customer Lookup)

**Select Vehicle:**
- Dropdown becomes enabled after customer selection
- Choose customer's vehicle

**Enter Mileage:**
- Type current mileage (e.g., 45000)

**Add Services:**
- Click category tabs to browse:
  - Oil Change
  - Fluid Services
  - Filters
  - Battery
  - Wipers
  - Lights
  - Tires
  - Inspection
- Click any service to add it
- Use +/- buttons to adjust quantity
- Click trash icon to remove

**Watch Pricing Update:**
- Subtotal updates automatically
- Tax calculated at 8.25%
- Total shown at bottom

**Optional - Assign Technician:**
- Select from dropdown

**Optional - Apply Discount:**
- Enter percentage or amount
- Enter reason
- See manager approval indicator if >10%

### 4. Create Ticket
- Click "Create Ticket" button
- See success message
- Ticket is saved!

## Example Test Cases

### Test Case 1: Simple Oil Change
1. Select customer
2. Select vehicle
3. Add "Full Synthetic Oil Change" ($79.99)
4. Expected total: $86.59 (with tax)
5. Create ticket ✅

### Test Case 2: Multiple Services
1. Select customer
2. Select vehicle
3. Add "Full Synthetic Oil Change" ($79.99)
4. Add "Engine Air Filter" ($39.99)
5. Add "Tire Rotation" ($29.99)
6. Expected total: $162.48 (with tax)
7. Create ticket ✅

### Test Case 3: Free Services
1. Select customer
2. Select vehicle
3. Add "Battery Test" (FREE)
4. Add "Multi-Point Inspection" (FREE)
5. Expected total: $0.00
6. Create ticket ✅

## Verify Success

### Browser Console (F12)
- No red errors
- See: `[TicketFormComponent] Ticket created successfully`

### Network Tab
- See POST to `http://localhost:3000/api/tickets`
- Status: 201 Created
- Response contains ticket data

### IndexedDB
- Open DevTools → Application tab
- IndexedDB → valvoline-pos-db
- Object Stores → tickets
- See your created ticket

## Troubleshooting

### "No services available"
- **Fix**: Restart mock backend
- Run: `npm run backend`

### Dropdowns are empty
- **Fix**: Create test customer first
- Navigate to: Home → Customer Lookup → Add New Customer

### Changes not appearing
- **Fix**: Hard refresh browser
- Mac: Cmd + Shift + R
- Windows/Linux: Ctrl + Shift + R

### Port already in use
- **Fix**: Kill existing process
- Mac/Linux: `lsof -ti:4200 | xargs kill -9`
- Windows: `netstat -ano | findstr :4200` then `taskkill /PID <PID> /F`

## What's Working

✅ Complete ticket creation flow
✅ 36 services across 8 categories
✅ Real-time pricing with tax
✅ Discount application
✅ Form validation
✅ Offline caching
✅ Mock backend persistence

## What's Not Working Yet

❌ Ticket list view (can't see created tickets)
❌ Ticket detail view (can't view/edit tickets)
❌ Status changes (Start Work, Complete, Mark Paid)
❌ Print work orders

## Need More Help?

See detailed guides:
- `SERVICE-TICKET-TESTING-GUIDE.md` - Comprehensive testing guide
- `WHATS-NEW.md` - What was just added
- `SERVICE-TICKET-PROGRESS.md` - Implementation status

---

**Quick Start**: Login → New Service Ticket → Select Customer → Select Vehicle → Add Services → Create Ticket ✅
