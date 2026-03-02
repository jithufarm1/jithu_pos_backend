# Pre-Deployment Testing Guide

## 🎯 Complete Feature Testing Checklist

Test all features locally before deploying to the cloud for your colleague.

---

## 🚀 Setup for Testing

### 1. Start Development Servers
```bash
# Terminal 1: Start backend API
cd vehicle-pos-pwa
node mock-backend/server.js

# Terminal 2: Start frontend
npm start

# Access at: http://localhost:4200
```

### 2. Test Credentials
```
Employee 1: EMP001 / SecurePass123!
Employee 2: EMP002 / Manager@2024
```

---

## ✅ Feature Testing Checklist

### 1. Authentication & Security
- [ ] **Login Page Loads**
  - Navigate to http://localhost:4200
  - Should redirect to /login
  - Page displays correctly

- [ ] **Successful Login**
  - Enter: EMP001 / SecurePass123!
  - Click "Sign In"
  - Should redirect to /home
  - User info displays in header

- [ ] **Failed Login - Wrong Password**
  - Logout and return to login
  - Enter: EMP001 / wrongpassword
  - Should show: "Invalid employee ID or password. 2 attempt(s) remaining."
  - Error message is generic (no info disclosure)

- [ ] **Account Lockout**
  - Enter wrong password 3 times
  - Should show: "Account temporarily locked. Please try again in 15 minutes."
  - Cannot login even with correct password

- [ ] **Session Persistence**
  - Login successfully
  - Refresh page
  - Should remain logged in

- [ ] **Logout**
  - Click user menu in header
  - Click "Logout"
  - Should redirect to /login
  - Session cleared

---

### 2. Home Dashboard
- [ ] **Dashboard Loads**
  - Login and navigate to /home
  - All sections display correctly
  - Metrics cards show data
  - Action buttons visible

- [ ] **Navigation Cards Work**
  - Click "New Service Ticket" → Goes to /tickets/new
  - Click "Search Vehicle" → Goes to /vehicle-search
  - Click "Find Customer" → Goes to /customers
  - Click "Schedule Appointment" → Goes to /appointments/new

- [ ] **User Menu**
  - Click user avatar in header
  - Menu opens with options
  - Click outside to close
  - All menu items work

---

### 3. Vehicle Search
- [ ] **Page Loads**
  - Navigate to /vehicle-search
  - Search form displays
  - Year/Make/Model dropdowns visible
  - VIN input visible

- [ ] **Search by VIN**
  - Enter VIN: 1HGBH41JXMN109186
  - Click "Search"
  - Results display
  - Vehicle details shown

- [ ] **Search by Year/Make/Model**
  - Select Year: 2020
  - Select Make: Honda
  - Select Model: Civic
  - Click "Search"
  - Results display

- [ ] **VIN Decoder (NHTSA API)**
  - Enter valid VIN
  - Search should use NHTSA API
  - Check browser console for API call
  - Results should include decoded data

- [ ] **No Results Handling**
  - Search for invalid VIN
  - Should show "No results found"
  - Error message is user-friendly

---

### 4. Customer Management
- [ ] **Customer List**
  - Navigate to /customers
  - List of customers displays
  - Search box works
  - Pagination works (if applicable)

- [ ] **View Customer Details**
  - Click on a customer
  - Goes to /customers/{id}
  - All customer info displays
  - Service history shows

- [ ] **Create New Customer**
  - Click "New Customer"
  - Goes to /customers/new
  - Fill out form:
    - Name: Test Customer
    - Email: test@example.com
    - Phone: (555) 123-4567
  - Click "Save"
  - Customer created successfully
  - Redirects to customer detail

- [ ] **Edit Customer**
  - View customer detail
  - Click "Edit"
  - Modify information
  - Click "Save"
  - Changes saved successfully

- [ ] **Delete Customer**
  - View customer detail
  - Click "Delete"
  - Confirm deletion
  - Customer removed
  - Redirects to customer list

- [ ] **Form Validation**
  - Try to save without required fields
  - Should show validation errors
  - Invalid email format rejected
  - Invalid phone format rejected

---

### 5. Service Ticket Management
- [ ] **Ticket List**
  - Navigate to /tickets
  - List of tickets displays
  - Filter by status works
  - Search works

- [ ] **View Ticket Details**
  - Click on a ticket
  - Goes to /tickets/{id}
  - All ticket info displays
  - Services listed
  - Total price calculated

- [ ] **Create New Ticket**
  - Click "New Ticket"
  - Goes to /tickets/new
  - Select customer
  - Select vehicle
  - Add services:
    - Oil Change
    - Tire Rotation
  - Prices calculate automatically
  - Click "Save"
  - Ticket created successfully

- [ ] **Service Catalog**
  - In ticket form
  - Click "Add Service"
  - Service catalog opens
  - Can browse categories
  - Can search services
  - Can select multiple services

- [ ] **Price Calculation**
  - Add multiple services
  - Subtotal calculates
  - Tax calculates (if applicable)
  - Total calculates correctly

- [ ] **Edit Ticket**
  - View ticket detail
  - Click "Edit"
  - Modify services
  - Click "Save"
  - Changes saved

- [ ] **Update Ticket Status**
  - View ticket detail
  - Change status (Pending → In Progress → Completed)
  - Status updates successfully

---

### 6. Appointment Scheduling
- [ ] **Appointment Calendar**
  - Navigate to /appointments
  - Calendar displays
  - Current month shown
  - Appointments visible

- [ ] **Calendar Views**
  - Switch to Daily view → Works
  - Switch to Weekly view → Works
  - Switch to Monthly view → Works
  - Navigate between dates → Works

- [ ] **Create New Appointment**
  - Click "New Appointment"
  - Goes to /appointments/new
  - Fill out form:
    - Customer: Select existing
    - Service Type: Oil Change
    - Date: Tomorrow
    - Time: 10:00 AM
  - Click "Save"
  - Appointment created
  - Shows in calendar

- [ ] **Time Slot Validation**
  - Try to book same time slot twice
  - Should show error
  - Prevents double booking

- [ ] **Edit Appointment**
  - Click appointment in calendar
  - Modify details
  - Save changes
  - Updates in calendar

- [ ] **Delete Appointment**
  - Click appointment
  - Click "Delete"
  - Confirm deletion
  - Removed from calendar

---

### 7. Data Management
- [ ] **Data Management Page**
  - Navigate to /settings/data-management
  - Page displays
  - Cache statistics shown
  - Clear cache button visible

- [ ] **View Cache Statistics**
  - Check IndexedDB usage
  - Check cache size
  - Check number of cached items

- [ ] **Clear Cache**
  - Click "Clear Cache"
  - Confirm action
  - Cache cleared
  - Statistics update

---

### 8. Offline Functionality
- [ ] **Service Worker Registration**
  - Open browser DevTools
  - Go to Application tab
  - Check Service Workers
  - Should show registered and active

- [ ] **Cache Data While Online**
  - Navigate through app
  - View customers, tickets, appointments
  - Data cached in IndexedDB

- [ ] **Test Offline Mode**
  - Stop backend server: `lsof -ti:3000 | xargs kill`
  - Or use DevTools: Network tab → Offline
  - Refresh page
  - App still loads
  - Can view cached data
  - Can navigate between pages

- [ ] **Offline Indicator**
  - Go offline
  - Check for offline indicator in UI
  - Should show "Offline" status

- [ ] **Create Data Offline**
  - While offline
  - Try to create customer/ticket
  - Should queue for sync
  - Shows pending status

- [ ] **Sync When Back Online**
  - Start backend server again
  - Or go back online in DevTools
  - Queued data syncs automatically
  - Pending items update

---

### 9. PWA Features
- [ ] **PWA Installable**
  - Open in Chrome/Edge
  - Look for install icon (⊕) in address bar
  - Icon should be visible

- [ ] **Install PWA**
  - Click install icon
  - Click "Install"
  - App opens in standalone window
  - No browser UI visible

- [ ] **App Icon**
  - Check installed app icon
  - Should show Valvoline logo

- [ ] **Standalone Mode**
  - Installed app runs without browser chrome
  - Looks like native app

- [ ] **Offline in PWA**
  - Open installed PWA
  - Go offline
  - App still works
  - Can access cached data

---

### 10. Responsive Design
- [ ] **Desktop (1920x1080)**
  - All pages display correctly
  - No layout issues
  - All features accessible

- [ ] **Tablet (768x1024)**
  - Open DevTools
  - Toggle device toolbar
  - Select iPad
  - All pages responsive
  - Navigation works

- [ ] **Mobile (375x667)**
  - Select iPhone SE
  - All pages responsive
  - Touch targets adequate
  - Forms usable
  - Navigation accessible

---

### 11. Browser Compatibility
- [ ] **Chrome**
  - All features work
  - No console errors
  - PWA installs

- [ ] **Firefox**
  - All features work
  - No console errors

- [ ] **Safari** (if on Mac)
  - All features work
  - No console errors

- [ ] **Edge**
  - All features work
  - No console errors
  - PWA installs

---

### 12. Performance
- [ ] **Page Load Speed**
  - Pages load quickly (<2 seconds)
  - No long delays
  - Smooth transitions

- [ ] **Navigation Speed**
  - Switching pages is fast
  - No lag or freezing

- [ ] **Search Performance**
  - Vehicle search returns quickly
  - Customer search is fast
  - No timeouts

- [ ] **Cache Performance**
  - Cache hits are fast (<50ms)
  - Check browser console for timing

---

### 13. Error Handling
- [ ] **Network Errors**
  - Simulate network failure
  - App shows appropriate error
  - Doesn't crash

- [ ] **Invalid Data**
  - Enter invalid form data
  - Validation errors show
  - User-friendly messages

- [ ] **404 Pages**
  - Navigate to /invalid-route
  - Should show error or redirect
  - Doesn't break app

- [ ] **API Errors**
  - Stop backend
  - Try to fetch data
  - Shows error message
  - Offers retry option

---

### 14. Security
- [ ] **Protected Routes**
  - Logout
  - Try to access /home directly
  - Should redirect to /login

- [ ] **Session Timeout** (if implemented)
  - Login
  - Wait for timeout period
  - Should logout automatically

- [ ] **XSS Prevention**
  - Try to enter `<script>alert('xss')</script>` in forms
  - Should be sanitized
  - No script execution

---

### 15. Data Integrity
- [ ] **Data Persistence**
  - Create customer
  - Refresh page
  - Customer still exists

- [ ] **Data Consistency**
  - Update ticket
  - View in different pages
  - Changes reflected everywhere

- [ ] **IndexedDB Storage**
  - Open DevTools → Application → IndexedDB
  - Check databases exist
  - Check data is stored correctly

---

## 🐛 Common Issues to Check

### Issue: Service Worker Not Updating
**Solution:**
```bash
# Clear Service Worker
# DevTools → Application → Service Workers → Unregister
# Then refresh page
```

### Issue: Offline Mode Not Working
**Check:**
- Service Worker registered
- Cache populated
- IndexedDB has data
- Network tab shows cached responses

### Issue: PWA Not Installing
**Check:**
- HTTPS enabled (or localhost)
- manifest.webmanifest accessible
- Service Worker active
- No console errors

### Issue: Forms Not Submitting
**Check:**
- Backend server running
- Network tab for API calls
- Console for errors
- Form validation passing

---

## 📊 Testing Report Template

Use this to track your testing:

```
Date: _______________
Tester: _______________

✅ = Pass
❌ = Fail
⚠️ = Issue (but not blocking)

Authentication:        [ ]
Home Dashboard:        [ ]
Vehicle Search:        [ ]
Customer Management:   [ ]
Service Tickets:       [ ]
Appointments:          [ ]
Data Management:       [ ]
Offline Mode:          [ ]
PWA Features:          [ ]
Responsive Design:     [ ]
Browser Compatibility: [ ]
Performance:           [ ]
Error Handling:        [ ]
Security:              [ ]
Data Integrity:        [ ]

Issues Found:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

Notes:
_______________________________________________
_______________________________________________
_______________________________________________

Ready for Deployment: [ ] Yes  [ ] No
```

---

## ✅ Pre-Deployment Checklist

Before deploying to cloud:

- [ ] All critical features tested and working
- [ ] No console errors
- [ ] Offline mode works
- [ ] PWA installs correctly
- [ ] Responsive on mobile
- [ ] Works in Chrome, Firefox, Edge
- [ ] Security features verified
- [ ] Data persists correctly
- [ ] Performance is acceptable
- [ ] Production build created successfully

---

## 🚀 Ready to Deploy?

Once all tests pass:

1. **Create production build:**
   ```bash
   npm run build:prod
   ```

2. **Test production build locally:**
   ```bash
   ./deploy.sh
   # Select option 5 (Local Test Server)
   # Test at http://localhost:8080
   ```

3. **Deploy to cloud:**
   ```bash
   ./deploy.sh
   # Select option 1 (Netlify)
   ```

4. **Share URL with colleague:**
   - You'll get a URL like: `https://vehicle-pos-pwa-abc123.netlify.app`
   - Send to colleague in USA
   - They can access immediately

---

## 📞 Need Help?

If you find issues during testing:
1. Check browser console for errors
2. Check Network tab for failed requests
3. Check Application tab for Service Worker status
4. Review the specific feature documentation
5. Let me know what's not working!

---

**Last Updated**: February 28, 2026
**Status**: Ready for testing
**Next Step**: Complete this checklist before deployment
