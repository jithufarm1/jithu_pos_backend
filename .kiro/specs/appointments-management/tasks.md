# Implementation Plan: Appointments Management

## Overview

This implementation plan breaks down the Appointments Management feature into discrete, incremental coding tasks. Each task builds on previous work, with property-based tests integrated throughout to validate correctness early. The implementation follows the existing Angular 17+ PWA architecture with offline-first patterns, IndexedDB caching, and network-first strategies.

## Tasks

- [x] 1. Set up appointments module structure and core models
  - Create `src/app/features/appointments/` directory structure
  - Create `src/app/core/models/appointment.model.ts` with all TypeScript interfaces (Appointment, ServiceType, TimeSlot, AppointmentSearchCriteria, AppointmentSummary, etc.)
  - Create `src/app/core/models/appointment-cache.model.ts` for cache-specific models (CachedAppointment, QueuedAppointmentOperation, ConflictResolution)
  - Define AppointmentStatus and ServiceCategory types
  - Define BusinessRules and StoreHours interfaces
  - _Requirements: 1.1, 1.6, 6.1, 6.2, 7.6, 12.1, 12.3, 12.4, 12.8_

- [x]* 1.1 Write property test for appointment model serialization
  - **Property 84: IndexedDB Serialization Round-Trip**
  - **Validates: Requirements 8.1, 14.5**

- [x] 2. Implement appointment cache repository
  - [x] 2.1 Create `src/app/core/repositories/appointment-cache.repository.ts` extending IndexedDBRepository
    - Implement save, getById, getByDate, getByDateRange methods
    - Implement update and delete methods
    - Implement search with multiple criteria support
    - Implement filterByStatus, filterByTechnician, filterByServiceType
    - Add IndexedDB indexes for scheduledDateTime, customerId, vehicleId, technicianId, status, serviceBay
    - _Requirements: 2.1, 2.2, 2.7, 3.1-3.7, 8.1, 14.4_

  - [x] 2.2 Implement cache management methods
    - Implement evictOldAppointments to remove past appointments
    - Implement clearCache method
    - Implement getStats for cache statistics
    - Implement preloadRelatedData to fetch customer and vehicle summaries
    - _Requirements: 14.6, 14.7_

  - [-]* 2.3 Write property tests for cache repository
    - **Property 13: Date Query Returns Sorted Results**
    - **Property 14: Date Range Query Returns Sorted Results**
    - **Property 21: Search Returns Matching Results**
    - **Property 73: Cache Update on Create/Update**
    - **Property 74: Old Appointment Eviction**
    - **Validates: Requirements 2.1, 2.2, 3.1-3.7, 14.5, 14.6**

- [x] 3. Implement service type management
  - [x] 3.1 Create service type data seeding
    - Create `src/app/core/data/service-types.data.ts` with predefined service types
    - Include all service categories (Oil Change, Fluid Service, Filter Service, Battery, Wiper, Light, Tire, Inspection)
    - Define duration for each service type
    - _Requirements: 6.1, 6.2_

  - [x] 3.2 Implement service type service
    - Create `src/app/features/appointments/services/service-type.service.ts`
    - Implement getServiceTypes method
    - Implement getServiceTypeById method
    - Implement calculateTotalDuration for multiple services
    - Implement createCustomServiceType method
    - Cache service types in IndexedDB on first load
    - _Requirements: 6.2, 6.3, 6.5_

  - [ ]* 3.3 Write property tests for service type calculations
    - **Property 3: End Time Calculation**
    - **Property 34: Service Type Data Completeness**
    - **Property 35: Custom Service Type Support**
    - **Validates: Requirements 1.3, 6.2, 6.3, 6.5**

- [x] 4. Implement time slot validator
  - [x] 4.1 Create `src/app/features/appointments/services/time-slot-validator.service.ts`
    - Implement isTimeSlotAvailable method with concurrent appointment checking
    - Implement getAvailableSlots method generating 30-minute intervals
    - Implement getAvailableBays method checking bay conflicts
    - Implement validateAppointmentTime for store hours checking
    - Implement validateDuration for positive duration checking
    - Implement validateBayNumber for 1-4 range checking
    - Implement validateWithinStoreHours including end time + buffer
    - Implement validateAdvanceBooking for 30-day window
    - Implement detectConflicts method
    - Implement wouldCauseOverbooking method
    - _Requirements: 1.5, 1.8, 1.9, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 12.3, 12.4_

  - [ ]* 4.2 Write property tests for time slot validation
    - **Property 5: Overbooking Prevention**
    - **Property 8: Advance Booking Window Validation**
    - **Property 9: Store Hours Validation**
    - **Property 10: Store Hours End Time Validation**
    - **Property 36: Concurrent Appointment Counting**
    - **Property 37: Available Slots Within Hours and Capacity**
    - **Property 38: Buffer Time Included in Availability**
    - **Property 67: Service Bay Number Validation**
    - **Property 68: Positive Duration Validation**
    - **Validates: Requirements 1.5, 1.8, 1.9, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 12.3, 12.4**

- [x] 5. Implement appointment service core operations
  - [x] 5.1 Create `src/app/features/appointments/services/appointment.service.ts`
    - Implement createAppointment with validation and network-first strategy
    - Implement createWalkIn using current timestamp
    - Implement getAppointmentById with cache fallback
    - Implement getAppointmentsByDate with sorting
    - Implement getAppointmentsByDateRange with sorting
    - Integrate with TimeSlotValidator for availability checking
    - Integrate with ServiceTypeService for duration calculation
    - Integrate with CustomerCacheRepository for customer validation
    - Integrate with VehicleCacheRepository for vehicle validation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 2.1, 2.2, 2.6, 2.7, 11.1, 11.2, 11.6_

  - [ ]* 5.2 Write property tests for appointment creation
    - **Property 1: Appointment Creation Assigns Unique ID**
    - **Property 2: Required Field Validation**
    - **Property 4: Buffer Time Constant**
    - **Property 6: Initial Status Assignment**
    - **Property 7: Walk-In Current Time**
    - **Property 11: Online Operations Persist Immediately**
    - **Property 12: Offline Operations Queued**
    - **Property 58: Customer ID Validation**
    - **Property 59: Vehicle Ownership Validation**
    - **Property 63: Technician ID Validation**
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.6, 1.7, 1.10, 1.11, 11.1, 11.2, 11.6**

- [x] 6. Implement appointment search and filtering
  - [x] 6.1 Add search methods to appointment service
    - Implement searchAppointments with CustomerSearchCriteria support
    - Implement filterByStatus method
    - Implement filterByTechnician method
    - Implement filterByServiceType method
    - Support multiple simultaneous filters
    - Use cache when offline, API when online
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 6.2 Write property test for search functionality
    - **Property 21: Search Returns Matching Results**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

- [x] 7. Checkpoint - Ensure core appointment operations work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement appointment update operations
  - [x] 8.1 Add update methods to appointment service
    - Implement updateAppointment with validation and optimistic locking
    - Implement rescheduleAppointment with availability re-validation
    - Implement reassignBay with bay availability checking
    - Implement reassignTechnician method
    - Implement updateServices with duration recalculation
    - Add validation to prevent updates to completed/cancelled appointments
    - Support online immediate persistence and offline queueing
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ]* 8.2 Write property tests for appointment updates
    - **Property 22: Update Applies Changes and Timestamp**
    - **Property 23: Reschedule Validates Availability**
    - **Property 24: Bay Reassignment Validates Availability**
    - **Property 25: Technician Reassignment Updates Assignment**
    - **Property 26: Service Modification Recalculates Duration**
    - **Property 27: Update Overbooking Prevention**
    - **Property 28: Completed/Cancelled Appointment Immutability**
    - **Property 70: Version Number Increment on Update**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.9, 13.6**

- [x] 9. Implement appointment status management
  - [x] 9.1 Add status management methods to appointment service
    - Implement checkInAppointment with timestamp recording
    - Implement startService with status validation
    - Implement completeAppointment with service history creation
    - Implement cancelAppointment with reason requirement (manager-only)
    - Implement markNoShow method
    - Add validation for early check-in prevention (>30 minutes before)
    - Add validation for status transition rules
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 11.5_

  - [ ]* 9.2 Write property tests for status management
    - **Property 29: Check-In Updates Status and Timestamp**
    - **Property 30: Start Service Updates Status and Timestamp**
    - **Property 31: Complete Updates Status and Timestamp**
    - **Property 32: Cancel Updates Status, Timestamp, and Reason**
    - **Property 33: Complete Requires In-Progress Status**
    - **Property 62: Completion Creates Service History**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.7, 11.5**

- [x] 10. Implement notification service
  - [x] 10.1 Create `src/app/features/appointments/services/notification.service.ts`
    - Implement sendAppointmentConfirmation method
    - Implement sendAppointmentReminder method
    - Implement sendCancellationNotice method
    - Implement sendRescheduleNotice method
    - Implement sendTechnicianNotification method
    - Implement getNotificationTemplate for each notification type
    - Implement formatNotification with variable substitution
    - Integrate with customer preferred contact method
    - _Requirements: 9.1, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 10.2 Write property tests for notifications
    - **Property 46: Confirmation Notification on Creation**
    - **Property 47: Cancellation Notification on Cancel**
    - **Property 48: Reschedule Notification on Reschedule**
    - **Property 49: Technician Assignment Notification**
    - **Property 50: Check-In Technician Notification**
    - **Property 51: Notification Content Completeness**
    - **Validates: Requirements 9.1, 9.3, 9.4, 9.5, 9.6, 9.7**

- [x] 11. Implement offline sync and conflict resolution
  - [x] 11.1 Extend appointment service with offline support
    - Implement queue operations for create, update, status changes when offline
    - Implement processQueuedOperations with chronological ordering
    - Implement detectConflict using version numbers
    - Implement resolveConflict with last-write-wins strategy
    - Implement sync-time availability re-validation
    - Add conflict notification to user
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 11.2 Write property tests for sync operations
    - **Property 40: Sync Queue Chronological Processing**
    - **Property 41: Conflict Detection During Sync**
    - **Property 42: Last-Write-Wins Conflict Resolution**
    - **Property 43: Cache Refresh After Sync**
    - **Property 44: Offline Availability Uses Cache Only**
    - **Property 45: Sync-Time Availability Validation**
    - **Property 71: Conflict Notification on Resolution**
    - **Property 72: Update Deleted Appointment Rejection**
    - **Validates: Requirements 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 13.2, 13.3, 13.4, 13.5**

- [x] 12. Checkpoint - Ensure backend integration works
  - Ensure all tests pass, ask the user if questions arise.


- [x] 13. Implement appointment form component
  - [x] 13.1 Create `src/app/features/appointments/components/appointment-form/appointment-form.component.ts`
    - Create reactive form with FormBuilder
    - Add customer search/select with autocomplete
    - Add vehicle dropdown filtered by selected customer
    - Add service type multi-select with checkboxes
    - Add date picker with validation
    - Add time slot picker showing available slots
    - Add service bay selector
    - Add technician dropdown
    - Display calculated duration and end time
    - Implement form validation (required fields, business rules)
    - Implement save method calling appointment service
    - Handle validation errors and display inline
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 1.9, 11.7_

  - [x] 13.2 Create `src/app/features/appointments/components/appointment-form/appointment-form.component.html`
    - Create form layout with Material Design components
    - Add customer autocomplete input
    - Add vehicle select dropdown
    - Add service type checkboxes grouped by category
    - Add date and time pickers
    - Add bay and technician selectors
    - Display duration calculation
    - Add notes textarea
    - Add save and cancel buttons
    - Show validation errors
    - _Requirements: 1.1, 1.2_

  - [x] 13.3 Create `src/app/features/appointments/components/appointment-form/appointment-form.component.css`
    - Style form layout with proper spacing
    - Style validation error messages
    - Style duration display
    - Ensure 44x44px touch targets
    - Add focus indicators
    - _Requirements: 13.4_

  - [ ]* 13.4 Write unit tests for appointment form
    - Test form validation for required fields
    - Test customer selection filters vehicles
    - Test duration calculation display
    - Test save button disabled when invalid
    - Test error message display

- [x] 14. Implement daily calendar view
  - [x] 14.1 Create `src/app/features/appointments/components/daily-view/daily-view.component.ts`
    - Create timeline grid component (8 AM - 6 PM in 30-min intervals)
    - Create 4 columns for service bays
    - Fetch appointments for selected date
    - Render appointment cards in correct time slots and bays
    - Implement color coding by status
    - Add quick check-in action button
    - Add click handler to open appointment details
    - Support drag-and-drop for rescheduling (optional)
    - _Requirements: 2.1, 2.3, 2.8_

  - [x] 14.2 Create `src/app/features/appointments/components/daily-view/daily-view.component.html`
    - Create timeline grid layout
    - Create bay column headers
    - Create time slot rows
    - Create appointment card template
    - Add status color indicators
    - Add quick action buttons
    - _Requirements: 2.3, 2.8_

  - [x] 14.3 Create `src/app/features/appointments/components/daily-view/daily-view.component.css`
    - Style timeline grid
    - Style appointment cards with status colors
    - Style bay columns
    - Add hover effects
    - Ensure responsive layout
    - _Requirements: 2.3_

  - [ ]* 14.4 Write property test for daily view
    - **Property 15: Daily View Display Completeness**
    - **Validates: Requirements 2.3**

- [x] 15. Implement weekly and monthly calendar views
  - [x] 15.1 Create `src/app/features/appointments/components/weekly-view/weekly-view.component.ts`
    - Create 6-day grid (Monday-Saturday)
    - Fetch appointments for the week
    - Group appointments by day
    - Calculate appointment counts per day
    - Add visual indicators for busy days (>10 appointments)
    - Add click handler to navigate to daily view
    - _Requirements: 2.4_

  - [x] 15.2 Create `src/app/features/appointments/components/monthly-view/monthly-view.component.ts`
    - Create calendar grid for the month
    - Fetch appointments for the month
    - Calculate appointment counts per day
    - Add color intensity based on volume
    - Add click handler to navigate to daily view
    - Add month navigation controls
    - _Requirements: 2.5_

  - [ ]* 15.3 Write property tests for calendar views
    - **Property 16: Weekly View Grouping Accuracy**
    - **Property 17: Monthly View Count Accuracy**
    - **Validates: Requirements 2.4, 2.5**

- [x] 16. Implement appointment calendar container
  - [x] 16.1 Create `src/app/features/appointments/components/appointment-calendar/appointment-calendar.component.ts`
    - Create view switcher (daily, weekly, monthly tabs)
    - Add date navigation controls (prev/next, today)
    - Add new appointment button
    - Add search button
    - Add refresh button with sync status indicator
    - Manage active view state
    - Handle date selection
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 16.2 Create HTML and CSS for calendar container
    - Create tab navigation for view switching
    - Create date navigation header
    - Create action button toolbar
    - Add router outlet for child views
    - Style with Material Design
    - _Requirements: 2.3, 2.4, 2.5_

- [ ] 17. Implement appointment detail component
  - [ ] 17.1 Create `src/app/features/appointments/components/appointment-detail/appointment-detail.component.ts`
    - Fetch appointment by ID from route params
    - Display appointment information
    - Fetch and display customer details
    - Fetch and display vehicle details
    - Display service list with durations
    - Display status timeline with timestamps
    - Add action buttons (check-in, start, complete, cancel, reschedule, edit)
    - Disable invalid actions based on status
    - Implement permission checking (manager-only cancel)
    - _Requirements: 2.8, 5.1, 5.2, 5.3, 5.4, 11.3, 11.4, 15.4_

  - [ ] 17.2 Create HTML and CSS for appointment detail
    - Create information card layout
    - Create customer and vehicle info sections
    - Create service list display
    - Create status timeline visualization
    - Create action button toolbar
    - Style with Material Design
    - _Requirements: 2.8, 11.3, 11.4_

  - [ ]* 17.3 Write property tests for appointment detail
    - **Property 20: Appointment Display Completeness**
    - **Property 60: Appointment Detail Customer Data Completeness**
    - **Property 61: Appointment Detail Vehicle Data Completeness**
    - **Validates: Requirements 2.8, 11.3, 11.4**

- [ ] 18. Implement appointment search component
  - [ ] 18.1 Create `src/app/features/appointments/components/appointment-search/appointment-search.component.ts`
    - Create search form with criteria selector
    - Add search input with debouncing (300ms)
    - Add filter chips (status, service type, technician, date range)
    - Implement search method calling appointment service
    - Display search results list
    - Add click handler to navigate to appointment detail
    - Show empty state with create appointment option
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ] 18.2 Create HTML and CSS for appointment search
    - Create search input with criteria dropdown
    - Create filter chip display
    - Create results list with appointment cards
    - Create empty state message
    - Style with Material Design
    - _Requirements: 3.1-3.7_

- [ ] 19. Implement time slot picker component
  - [ ] 19.1 Create `src/app/features/appointments/components/time-slot-picker/time-slot-picker.component.ts`
    - Create date picker
    - Fetch available time slots for selected date and duration
    - Display time slots in grid format
    - Gray out unavailable slots
    - Show available bay count per slot
    - Emit selected time slot to parent
    - Update slots when duration changes
    - _Requirements: 7.3_

  - [ ] 19.2 Create HTML and CSS for time slot picker
    - Create date picker input
    - Create time slot grid
    - Style available vs unavailable slots
    - Add bay availability indicators
    - _Requirements: 7.3_

- [ ] 20. Implement service type selector component
  - [ ] 20.1 Create `src/app/features/appointments/components/service-type-selector/service-type-selector.component.ts`
    - Fetch service types from service
    - Group services by category
    - Create multi-select checkboxes
    - Display duration per service
    - Calculate and display total duration
    - Add custom service option
    - Emit selected service types to parent
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [ ] 20.2 Create HTML and CSS for service type selector
    - Create category sections
    - Create checkbox list
    - Display duration badges
    - Show total duration prominently
    - Add custom service dialog
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 21. Checkpoint - Ensure UI components work together
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Implement reporting and analytics
  - [ ] 22.1 Add reporting methods to appointment service
    - Implement getDailySummary with status counts
    - Implement getServiceTypeDistribution with percentages
    - Implement getTechnicianUtilization with percentage calculation
    - Implement getNoShowRate with percentage calculation
    - Implement getAverageServiceTime with mean calculation
    - Add filtering support (date range, technician, service type)
    - Add manager permission checking
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 15.5_

  - [ ]* 22.2 Write property tests for reporting calculations
    - **Property 52: Daily Summary Calculation Accuracy**
    - **Property 53: Service Type Distribution Calculation**
    - **Property 54: Technician Utilization Calculation**
    - **Property 55: No-Show Rate Calculation**
    - **Property 56: Average Service Time Calculation**
    - **Property 57: Report Filtering Accuracy**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**

  - [ ] 22.3 Create `src/app/features/appointments/components/appointment-reports/appointment-reports.component.ts`
    - Create report type selector (daily summary, service distribution, technician utilization, no-show rate)
    - Add date range picker
    - Add filter controls (technician, service type)
    - Fetch report data from appointment service
    - Display data in table format
    - Integrate Chart.js for visualizations
    - Add export to PDF/CSV buttons
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [ ] 22.4 Create HTML and CSS for reports component
    - Create report selector tabs
    - Create date range picker
    - Create filter controls
    - Create table display
    - Create chart containers
    - Style with Material Design
    - _Requirements: 10.1-10.7_

- [ ] 23. Implement authorization and security
  - [ ] 23.1 Add permission checking to appointment service
    - Implement checkPermission method using AuthService
    - Add permission checks to cancelAppointment (manager-only)
    - Add permission checks to reporting methods (manager-only)
    - Return authorization errors for unauthorized operations
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ] 23.2 Implement audit logging
    - Create audit log entry on all appointment operations
    - Include user ID, operation type, appointment ID, timestamp
    - Store audit logs in IndexedDB
    - Sync audit logs to backend when online
    - _Requirements: 15.8_

  - [ ]* 23.3 Write property tests for authorization
    - **Property 76: Technician and Manager Create Permission**
    - **Property 77: Technician and Manager Update Permission**
    - **Property 78: Technician and Manager Check-In Permission**
    - **Property 79: Manager-Only Cancellation Permission**
    - **Property 80: Manager-Only Reporting Permission**
    - **Property 81: Unauthorized Operation Rejection**
    - **Property 82: Authentication Token Validation**
    - **Property 83: Audit Logging for All Operations**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8**

- [ ] 24. Implement data validation service extensions
  - [ ] 24.1 Extend `src/app/core/services/validation.service.ts` with appointment validations
    - Implement validateAppointmentDateTime (not in past, within advance window)
    - Implement validateStoreHours (8 AM - 6 PM, not Sunday)
    - Implement validateEndTimeWithinHours (end + buffer before 6 PM)
    - Implement validateServiceBayNumber (1-4)
    - Implement validateDuration (positive, non-zero)
    - Implement validateCancellationReason (required for cancellations)
    - Implement validateISOTimestamp format
    - _Requirements: 1.8, 1.9, 7.6, 7.7, 12.1, 12.2, 12.3, 12.4, 12.7, 12.8_

  - [ ]* 24.2 Write property tests for validation
    - **Property 65: Start Time Before End Time Invariant**
    - **Property 66: No Past Appointments (Except Walk-Ins)**
    - **Property 69: ISO 8601 Timestamp Format**
    - **Validates: Requirements 12.1, 12.2, 12.8**

- [ ] 25. Implement cache initialization and management
  - [ ] 25.1 Add cache initialization to appointment service
    - Implement initializeCache method called on app start
    - Fetch appointments for next 7 days from API
    - Preload customer and vehicle data for each appointment
    - Store in appointment cache repository
    - Implement refreshCache method for manual refresh
    - Add cache statistics method
    - _Requirements: 8.1, 14.4, 14.7_

  - [ ]* 25.2 Write property tests for cache management
    - **Property 39: Cache Initialization Scope**
    - **Property 75: Preloaded Related Data**
    - **Validates: Requirements 8.1, 14.4, 14.7**

- [ ] 26. Implement routing and navigation
  - [ ] 26.1 Create appointments routing module
    - Create `src/app/features/appointments/appointments.routes.ts`
    - Define routes: /appointments (calendar), /appointments/new (form), /appointments/:id (detail), /appointments/search, /appointments/reports
    - Add route guards for authentication
    - Add route guards for manager-only routes (reports)
    - Configure lazy loading
    - _Requirements: 15.1, 15.5_

  - [ ] 26.2 Add appointments navigation to main app
    - Add "Appointments" link to main navigation menu
    - Add icon for appointments feature
    - Update `src/app/app.routes.ts` to include appointments routes
    - _Requirements: 2.1_

- [ ] 27. Implement walk-in appointment flow
  - [ ] 27.1 Add walk-in creation to appointment service
    - Create createWalkIn method using current timestamp
    - Auto-select first available bay
    - Set status to "scheduled"
    - Skip time slot validation for current time
    - _Requirements: 1.7_

  - [ ] 27.2 Add walk-in button to calendar view
    - Add "Walk-In" button to calendar toolbar
    - Open simplified form with current time pre-filled
    - Auto-populate date/time fields
    - _Requirements: 1.7_

- [ ] 28. Implement appointment reschedule dialog
  - [ ] 28.1 Create reschedule dialog component
    - Create `src/app/features/appointments/components/reschedule-dialog/reschedule-dialog.component.ts`
    - Display current appointment details
    - Add date and time slot picker
    - Validate new time slot availability
    - Call rescheduleAppointment service method
    - Send reschedule notification
    - _Requirements: 4.2, 9.4_

  - [ ] 28.2 Create HTML and CSS for reschedule dialog
    - Create dialog layout
    - Display current vs new time comparison
    - Add time slot picker
    - Add confirm and cancel buttons
    - _Requirements: 4.2_

- [ ] 29. Implement appointment cancellation dialog
  - [ ] 29.1 Create cancellation dialog component
    - Create `src/app/features/appointments/components/cancel-dialog/cancel-dialog.component.ts`
    - Display appointment details
    - Add cancellation reason textarea (required)
    - Validate manager permission
    - Call cancelAppointment service method
    - Send cancellation notification
    - _Requirements: 5.4, 12.7, 15.4_

  - [ ] 29.2 Create HTML and CSS for cancellation dialog
    - Create dialog layout
    - Add reason textarea with validation
    - Add confirm and cancel buttons
    - Show manager-only indicator
    - _Requirements: 5.4, 12.7_

- [ ] 30. Checkpoint - Ensure all UI flows work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 31. Implement automatic no-show detection
  - [ ] 31.1 Create no-show detection service
    - Create `src/app/features/appointments/services/no-show-detector.service.ts`
    - Implement periodic check (every 5 minutes) for appointments past scheduled time + 15 minutes
    - Filter for appointments with status "scheduled"
    - Call markNoShow for qualifying appointments
    - Run check on app start and periodically while app is active
    - _Requirements: 5.5_

  - [ ]* 31.2 Write unit test for no-show detection
    - Test appointments 15+ minutes past scheduled time are marked no-show
    - Test appointments within 15 minutes are not marked
    - Test only "scheduled" status appointments are checked

- [ ] 32. Implement notification templates and formatting
  - [ ] 32.1 Create notification templates
    - Create `src/app/features/appointments/data/notification-templates.data.ts`
    - Define templates for confirmation, reminder, cancellation, reschedule, technician assignment, check-in
    - Include variable placeholders ({{customerName}}, {{vehicleInfo}}, {{dateTime}}, etc.)
    - _Requirements: 9.1, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 32.2 Write unit tests for notification formatting
    - Test variable substitution works correctly
    - Test all required details included in messages
    - Test preferred contact method is used

- [ ] 33. Implement integration with customer and vehicle services
  - [ ] 33.1 Add customer lookup to appointment service
    - Implement getCustomerSummary method
    - Validate customer exists before appointment creation
    - Fetch customer vehicles for vehicle selection
    - Cache customer data with appointments
    - _Requirements: 11.1, 11.3, 11.7_

  - [ ] 33.2 Add vehicle lookup to appointment service
    - Implement getVehicleSummary method
    - Validate vehicle exists and belongs to customer
    - Cache vehicle data with appointments
    - _Requirements: 11.2, 11.4_

  - [ ] 33.3 Add service history creation on completion
    - Implement createServiceHistoryRecord method
    - Call on appointment completion
    - Link to vehicle ID
    - Include all appointment details
    - _Requirements: 11.5_

  - [ ]* 33.4 Write property test for vehicle ownership validation
    - **Property 64: Vehicle Selection Filtered by Customer**
    - **Validates: Requirements 11.7**

- [ ] 34. Implement mock backend endpoints
  - [ ] 34.1 Add appointments endpoints to `mock-backend/server.js`
    - Add POST /api/appointments endpoint
    - Add GET /api/appointments/:id endpoint
    - Add GET /api/appointments with date/range query params
    - Add PUT /api/appointments/:id endpoint
    - Add DELETE /api/appointments/:id endpoint
    - Add POST /api/appointments/:id/check-in endpoint
    - Add POST /api/appointments/:id/start endpoint
    - Add POST /api/appointments/:id/complete endpoint
    - Add POST /api/appointments/:id/cancel endpoint
    - Add GET /api/appointments/available-slots endpoint
    - Add GET /api/service-types endpoint
    - Add reporting endpoints
    - Implement version conflict detection (409 response)
    - _Requirements: 1.1, 1.10, 2.1, 2.2, 2.6, 4.1, 4.7, 5.1, 5.2, 5.3, 5.4, 5.8, 13.6_

  - [ ] 34.2 Add appointments seed data to `mock-backend/db.json`
    - Add sample appointments for next 7 days
    - Add service types data
    - Link to existing customers and vehicles
    - Include various statuses
    - _Requirements: 6.1, 8.1_

- [ ] 35. Implement API serialization and error handling
  - [ ]* 35.1 Write property test for API serialization
    - **Property 85: API Serialization Round-Trip**
    - **Validates: Requirements 1.10, 4.7**

  - [ ]* 35.2 Write unit tests for error handling
    - Test validation error display
    - Test availability error with alternative suggestions
    - Test authorization error display
    - Test network error with offline fallback
    - Test conflict error with resolution dialog

- [ ] 36. Implement offline indicator and sync status
  - [ ] 36.1 Add sync status to appointment calendar
    - Display offline indicator when offline
    - Display "queued for sync" badge on pending appointments
    - Show sync progress during queue processing
    - Add manual sync button
    - _Requirements: 8.2, 12.6_

  - [ ] 36.2 Add conflict resolution dialog
    - Create dialog showing local vs server versions
    - Display resolution applied (server wins)
    - Allow user to review changes
    - _Requirements: 8.5, 13.3, 13.4_

- [ ] 37. Final integration and wiring
  - [ ] 37.1 Wire all components together
    - Connect appointment calendar to child views
    - Connect appointment form to appointment service
    - Connect appointment detail to status management
    - Connect search to appointment service
    - Connect reports to appointment service
    - Ensure navigation flows work correctly
    - _Requirements: All_

  - [ ] 37.2 Add appointments feature to home page
    - Add "Appointments" card to home page dashboard
    - Show today's appointment count
    - Add quick action to view today's schedule
    - _Requirements: 2.1_

  - [ ]* 37.3 Write integration tests
    - Test create appointment → view in calendar flow
    - Test search → detail → check-in → complete flow
    - Test offline create → sync → conflict resolution flow
    - Test reschedule → availability check → notification flow

- [ ] 38. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end flows
- The implementation follows existing patterns from customer-management feature
- All components use Angular standalone architecture
- All services use RxJS observables for async operations
- All data persistence uses IndexedDB through repository pattern
