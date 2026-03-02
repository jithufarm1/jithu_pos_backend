# Implementation Plan: Customer Management

## Overview

This implementation plan breaks down the Customer Management feature into incremental coding tasks. Each task builds on previous work, with property-based tests integrated throughout to catch errors early. The implementation follows the existing Angular standalone component architecture and repository patterns established in the codebase.

## Tasks

- [x] 1. Set up core infrastructure and data models
  - [x] 1.1 Create customer data models and interfaces
    - Create comprehensive TypeScript interfaces in `src/app/core/models/customer.model.ts`
    - Include Customer, CustomerVehicle, ServiceRecord, LoyaltyProgram, CustomerAnalytics
    - Include search and filter interfaces
    - _Requirements: All requirements (data foundation)_
  
  - [x] 1.2 Create ValidationService for customer and vehicle data
    - Implement phone, email, ZIP, state, VIN, year validation methods
    - Implement duplicate detection methods
    - Return structured ValidationResult objects
    - _Requirements: 2.6, 2.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  
  - [ ]* 1.3 Write property tests for ValidationService
    - **Property 7: Phone Number Validation**
    - **Property 8: Email Address Validation**
    - **Property 29: VIN Format Validation**
    - **Property 45: ZIP Code Validation**
    - **Property 46: State Code Validation**
    - **Property 47: Vehicle Year Validation**
    - Generate random valid/invalid inputs, verify correct acceptance/rejection
    - _Requirements: 2.6, 2.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 2. Implement CustomerCacheRepository for offline support
  - [x] 2.1 Create CustomerCacheRepository extending IndexedDBRepository
    - Implement save, getById, update, delete methods
    - Implement search methods (by phone, email, lastName, VIN, licensePlate)
    - Implement LRU eviction strategy (max 500 customers)
    - Add indexes for efficient searching
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.8, 12.1_
  
  - [x] 2.2 Update IndexedDB schema to include customer-cache store
    - Modify `src/app/core/repositories/indexeddb.repository.ts` onupgradeneeded
    - Create customer-cache object store with customerId keyPath
    - Add indexes: phone, email, lastName, cachedAt
    - Add compound index for VIN and licensePlate searches
    - _Requirements: 2.8, 12.1_
  
  - [ ]* 2.3 Write property tests for CustomerCacheRepository
    - **Property 9: Customer Persistence to IndexedDB**
    - **Property 48: Offline Read Access**
    - **Property 62: IndexedDB Serialization Round-Trip**
    - Generate random customers, save/retrieve, verify data integrity
    - _Requirements: 2.8, 12.1, 16.1, 16.2_


- [x] 3. Implement CustomerService with network-first strategy
  - [x] 3.1 Create CustomerService with search operations
    - Implement searchCustomers with multiple criteria support
    - Implement network-first with cache fallback pattern
    - Implement getCustomerById with caching
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1_
  
  - [x] 3.2 Implement customer CRUD operations in CustomerService
    - Implement createCustomer with duplicate detection
    - Implement updateCustomer with validation
    - Implement deleteCustomer with archival logic
    - Integrate with CustomerCacheRepository
    - _Requirements: 2.2, 2.3, 2.4, 3.2, 3.4, 3.5, 5.2, 5.4_
  
  - [x] 3.3 Implement offline queueing for write operations
    - Queue create/update/delete operations when offline
    - Use RequestQueueRepository for persistence
    - Generate unique operation IDs for idempotency
    - _Requirements: 2.9, 3.6, 5.5, 12.2_
  
  - [ ]* 3.4 Write property tests for CustomerService search
    - **Property 1: Search Returns Matching Customers**
    - **Property 2: Search Results Contain Required Information**
    - **Property 3: Search Results Sorted by Last Visit**
    - Generate random customer databases and search criteria
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8_
  
  - [ ]* 3.5 Write property tests for CustomerService CRUD
    - **Property 4: Customer Creation Assigns Unique ID**
    - **Property 5: Duplicate Prevention**
    - **Property 6: Required Field Validation**
    - **Property 19: Deletion Removes Customer Data**
    - **Property 21: Service History Archival on Deletion**
    - Generate random customer data and operations
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.4, 3.5, 5.2, 5.4, 11.8_
  
  - [ ]* 3.6 Write property tests for offline queueing
    - **Property 10: Offline Operations Queued**
    - **Property 49: Synchronization Queue Ordering**
    - Generate random operations, perform offline, verify queueing and ordering
    - _Requirements: 2.9, 3.6, 5.5, 6.9, 8.7, 12.2, 12.3_

- [ ] 4. Implement vehicle management operations
  - [ ] 4.1 Add vehicle operations to CustomerService
    - Implement addVehicle with VIN validation and duplicate detection
    - Implement updateVehicle with validation
    - Implement removeVehicle with service record preservation
    - Implement setPrimaryVehicle with exclusivity logic
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  
  - [ ]* 4.2 Write property tests for vehicle management
    - **Property 22: Vehicle Addition with VIN Validation**
    - **Property 23: VIN Uniqueness Enforcement**
    - **Property 24: First Vehicle Auto-Primary**
    - **Property 25: Primary Vehicle Exclusivity**
    - **Property 27: Vehicle Removal Preserves Service Records**
    - **Property 28: Primary Vehicle Reassignment**
    - Generate random customers and vehicles, test operations
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 6.7_

- [ ] 5. Implement service history and analytics
  - [ ] 5.1 Add service history operations to CustomerService
    - Implement getServiceHistory with filtering (date range, service type)
    - Implement getServiceRecordDetail
    - Implement service history sorting (date descending)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 5.2 Implement customer analytics calculation
    - Implement getCustomerAnalytics method
    - Calculate total visits, total spent, average ticket value
    - Identify last visit date and preferred services
    - Count vehicles
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ]* 5.3 Write property tests for service history
    - **Property 30: Service History Chronological Ordering**
    - **Property 31: Service History Date Range Filtering**
    - **Property 32: Service History Type Filtering**
    - **Property 34: Service History Print Completeness**
    - Generate random service records, test filtering and ordering
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  
  - [ ]* 5.4 Write property tests for analytics
    - **Property 15: Analytics Calculation Accuracy**
    - Generate random service histories, verify calculations
    - _Requirements: 4.3, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 6. Checkpoint - Ensure core services pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement loyalty program operations
  - [ ] 7.1 Add loyalty operations to CustomerService
    - Implement getLoyaltyStatus
    - Implement redeemPoints with balance validation
    - Implement getPointsHistory
    - Implement tier calculation logic (Bronze: 0-999, Silver: 1000-2499, Gold: 2500-4999, Platinum: 5000+)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 7.2 Write property tests for loyalty operations
    - **Property 37: Point Redemption Updates Balance**
    - **Property 38: Loyalty Tier Recalculation**
    - Generate random point balances and redemptions, verify calculations
    - _Requirements: 8.3, 8.4, 8.5_

- [ ] 8. Implement communication and export operations
  - [ ] 8.1 Add communication operations to CustomerService
    - Implement sendEmail with template support
    - Implement sendSMS
    - Implement exportCustomerData (JSON generation)
    - Implement print generation for customer info and service history
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 7.5_
  
  - [ ]* 8.2 Write property tests for communication
    - **Property 39: Email Interface Pre-population**
    - **Property 40: SMS Interface Pre-population**
    - **Property 42: Customer Data Export Completeness**
    - **Property 43: Marketing Opt-Out Warning**
    - **Property 44: Preferred Contact Method Respected**
    - Generate random customers, test communication operations
    - _Requirements: 10.1, 10.2, 10.4, 10.5, 10.6_

- [ ] 9. Implement CustomerSearchComponent
  - [x] 9.1 Create customer search component with reactive form
    - Create standalone component with search input
    - Implement real-time search with debouncing (300ms)
    - Display search results with CustomerSummary cards
    - Add empty state with "Create Customer" button
    - Add loading state during search
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.9, 13.1_
  
  - [x] 9.2 Add search result actions and navigation
    - Add "View Details" button per result
    - Add "New Service" quick action button
    - Implement navigation to customer detail view
    - Preserve search context in navigation state
    - _Requirements: 4.1, 13.3_
  
  - [ ]* 9.3 Write unit tests for CustomerSearchComponent
    - Test empty search state display
    - Test no results state display
    - Test search result rendering
    - Test navigation with context preservation
    - _Requirements: 1.7, 1.9, 13.1, 13.3_

- [x] 10. Implement CustomerFormComponent
  - [x] 10.1 Create customer form component with validation
    - Create reactive form with all customer fields
    - Implement real-time validation with ValidationService
    - Display inline validation errors
    - Implement duplicate detection on phone/email blur
    - Add address fields with state dropdown
    - Add communication preferences section
    - _Requirements: 2.1, 2.5, 2.6, 2.7, 3.1, 3.3_
  
  - [x] 10.2 Implement form submission and error handling
    - Handle create and update modes
    - Call CustomerService create/update methods
    - Display success confirmation (3 second toast)
    - Handle and display validation/conflict errors
    - Implement offline indicator and queueing feedback
    - _Requirements: 2.2, 2.3, 2.4, 3.2, 3.4, 3.5, 13.5, 13.6_
  
  - [ ]* 10.3 Write property tests for form validation
    - **Property 11: Edit Form Pre-population**
    - **Property 12: Update Validation and Persistence**
    - **Property 13: Invalid Update Rejection**
    - Generate random customer data, test form behavior
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 11. Implement CustomerDetailComponent
  - [x] 11.1 Create customer detail component with sections
    - Create component with customer info section
    - Add vehicle list section with primary indicator
    - Add service history summary section
    - Add loyalty status section
    - Add analytics dashboard section
    - Add action buttons (Edit, Delete, Email, SMS, Print, Export)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 11.2 Implement customer detail actions
    - Implement edit navigation
    - Implement delete with confirmation dialog
    - Implement communication actions (email, SMS)
    - Implement print customer info
    - Implement export customer data
    - Add offline indicator
    - _Requirements: 5.1, 5.3, 10.1, 10.2, 10.3, 10.4, 12.5_
  
  - [ ]* 11.3 Write property tests for customer detail display
    - **Property 14: Customer Profile Display Completeness**
    - **Property 16: Primary Vehicle Indication**
    - **Property 33: Service Record Detail Completeness**
    - Generate random customers, verify display completeness
    - _Requirements: 4.2, 4.4, 7.4_


- [ ] 12. Implement VehicleListComponent and VehicleFormComponent
  - [ ] 12.1 Create VehicleListComponent
    - Display vehicle cards with key information
    - Show primary vehicle badge
    - Add "Add Vehicle" button
    - Add edit/remove actions per vehicle
    - Show vehicle count
    - _Requirements: 4.2, 6.3, 6.4, 9.6_
  
  - [ ] 12.2 Create VehicleFormComponent with validation
    - Create reactive form for vehicle data
    - Implement VIN validation and duplicate detection
    - Add year/make/model dropdowns
    - Add mileage, license plate, color fields
    - Add "Set as Primary" checkbox
    - Implement VIN lookup integration
    - _Requirements: 6.1, 6.2, 6.5, 6.8_
  
  - [ ] 12.3 Implement vehicle form submission
    - Handle add and edit modes
    - Call CustomerService vehicle methods
    - Display confirmation dialog for removal
    - Handle primary vehicle logic
    - _Requirements: 6.1, 6.4, 6.5, 6.6_
  
  - [ ]* 12.4 Write property tests for vehicle operations
    - **Property 26: Vehicle Update Validation**
    - **Property 18: Deletion Confirmation Required**
    - **Property 20: Deletion Cancellation Preserves Data**
    - Generate random vehicles and operations
    - _Requirements: 6.5, 5.1, 5.3_

- [ ] 13. Implement ServiceHistoryComponent
  - [ ] 13.1 Create service history component with filtering
    - Display service records in chronological order (descending)
    - Implement date range filter
    - Implement service type filter
    - Add expandable service detail view
    - Add print button
    - Show empty state when no history
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ] 13.2 Implement service history print functionality
    - Generate formatted printable document
    - Include all service records with complete details
    - Add customer and vehicle information header
    - _Requirements: 7.5_
  
  - [ ]* 13.3 Write unit tests for ServiceHistoryComponent
    - Test empty service history display
    - Test service record rendering
    - Test filter application
    - Test print generation
    - _Requirements: 7.6_

- [ ] 14. Implement LoyaltyDisplayComponent
  - [ ] 14.1 Create loyalty display component
    - Display points balance with tier badge
    - Show available rewards
    - Display points history with transactions
    - Add "Redeem Points" action
    - Show enrollment option when not enrolled
    - _Requirements: 8.1, 8.2, 8.6_
  
  - [ ] 14.2 Implement point redemption functionality
    - Create redemption dialog with reward selection
    - Validate sufficient balance
    - Call CustomerService redeemPoints
    - Update display after redemption
    - Handle offline queueing
    - _Requirements: 8.3, 8.7_
  
  - [ ]* 14.3 Write property tests for loyalty operations
    - **Property 35: Loyalty Information Display**
    - **Property 36: Points History Display**
    - Generate random loyalty data, verify display
    - _Requirements: 8.1, 8.2_

- [ ] 15. Implement customer analytics dashboard
  - [ ] 15.1 Create analytics display in CustomerDetailComponent
    - Display total visits, total spent, average ticket value
    - Display last visit date
    - Display top 3 preferred services with counts
    - Display vehicle count
    - Add visual charts/graphs for key metrics
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ]* 15.2 Write unit tests for analytics display
    - Test analytics calculation with sample data
    - Test display with zero history
    - Test preferred services ranking
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 16. Checkpoint - Ensure all components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Implement synchronization and conflict resolution
  - [ ] 17.1 Create SyncService for queue processing
    - Implement automatic sync on network restoration
    - Process queued operations in chronological order
    - Implement exponential backoff for retries
    - Handle operation idempotency
    - _Requirements: 12.3_
  
  - [ ] 17.2 Implement conflict resolution logic
    - Detect conflicts between local and server data
    - Apply server-authoritative resolution
    - Display conflict notification to employee
    - Update local cache with server data
    - _Requirements: 12.4_
  
  - [ ]* 17.3 Write property tests for synchronization
    - **Property 50: Conflict Resolution Server Authority**
    - Generate random conflicts, verify server data wins
    - _Requirements: 12.4_

- [ ] 18. Implement offline indicators and status display
  - [ ] 18.1 Add offline status indicators to all components
    - Add offline badge to CustomerDetailComponent
    - Add pending sync indicator for modified data
    - Add offline message for cache miss scenarios
    - Integrate with NetworkDetectionService
    - _Requirements: 4.5, 7.7, 12.5, 12.6, 12.7_
  
  - [ ]* 18.2 Write property tests for offline indicators
    - **Property 17: Offline Data Display with Indicator**
    - **Property 51: Pending Sync Indicator**
    - Generate random offline scenarios, verify indicators
    - _Requirements: 4.5, 7.7, 12.5, 12.6_

- [ ] 19. Implement UI/UX enhancements
  - [ ] 19.1 Add touch-friendly styling and interactions
    - Ensure all buttons meet 44x44 pixel minimum
    - Add touch feedback animations
    - Implement large, clear typography
    - Add keyboard shortcuts (Enter, Escape, Ctrl+S)
    - _Requirements: 13.4, 13.7_
  
  - [ ] 19.2 Implement loading states and feedback
    - Add loading spinners for async operations
    - Add success toast notifications (3 second duration)
    - Add error toast notifications with actionable messages
    - Add skeleton loaders for data fetching
    - _Requirements: 13.2, 13.5, 13.6_
  
  - [ ]* 19.3 Write property tests for UI requirements
    - **Property 53: Touch Target Minimum Size**
    - **Property 54: Success Confirmation Display**
    - **Property 55: Error Message Display**
    - **Property 56: Keyboard Navigation Support**
    - Verify UI elements meet requirements
    - _Requirements: 13.4, 13.5, 13.6, 13.7_

- [ ] 20. Implement security and access control
  - [ ] 20.1 Add permission checks for sensitive operations
    - Implement manager permission check for customer deletion
    - Integrate with AuthService for permission validation
    - Display access denied messages for unauthorized attempts
    - _Requirements: 15.3_
  
  - [ ] 20.2 Implement audit logging for exports
    - Log customer data exports with employee ID and timestamp
    - Store logs in IndexedDB
    - Include customer ID and export type in log
    - _Requirements: 15.4_
  
  - [ ] 20.3 Implement data masking for sensitive information
    - Mask credit card numbers (show last 4 digits only)
    - Implement session expiration cleanup
    - Clear cached customer data from memory on logout
    - _Requirements: 15.5, 15.6_
  
  - [ ] 20.4 Ensure HTTPS for all API calls
    - Verify environment.apiBaseUrl uses HTTPS
    - Add runtime check for HTTPS protocol
    - Log warning if HTTP is detected
    - _Requirements: 15.1_
  
  - [ ]* 20.5 Write property tests for security features
    - **Property 57: HTTPS Protocol Usage**
    - **Property 58: Manager Permission for Deletion**
    - **Property 59: Export Audit Logging**
    - **Property 60: Credit Card Masking**
    - **Property 61: Session Expiration Cleanup**
    - Generate random scenarios, verify security measures
    - _Requirements: 15.1, 15.3, 15.4, 15.5, 15.6_

- [ ] 21. Implement API serialization with round-trip validation
  - [ ] 21.1 Ensure proper JSON serialization for API calls
    - Verify Customer_Profile serialization to JSON
    - Verify JSON deserialization to Customer_Profile
    - Implement ISO 8601 date formatting
    - Implement currency precision handling (2 decimal places)
    - _Requirements: 16.3, 16.4, 16.5, 16.6_
  
  - [ ]* 21.2 Write property tests for serialization
    - **Property 63: API Serialization Round-Trip**
    - **Property 64: ISO 8601 Date Format**
    - **Property 65: Currency Precision Preservation**
    - Generate random customer objects, test round-trip
    - _Requirements: 16.3, 16.4, 16.5, 16.6_

- [x] 22. Wire components together and implement routing
  - [x] 22.1 Create customer feature routing module
    - Define routes: /customers (search), /customers/:id (detail), /customers/new (create), /customers/:id/edit (edit)
    - Implement route guards for authentication
    - Add navigation between components
    - _Requirements: 4.1, 13.3_
  
  - [x] 22.2 Integrate customer module into main application
    - Add customer routes to app routing
    - Add "Customers" navigation link to main menu
    - Ensure lazy loading for customer module
    - _Requirements: 13.1_
  
  - [ ]* 22.3 Write property tests for navigation
    - **Property 52: Navigation Context Preservation**
    - Test navigation flows, verify context preservation
    - _Requirements: 13.3_

- [x] 23. Update mock backend API with customer endpoints
  - [x] 23.1 Add customer endpoints to mock-backend/server.js
    - Add GET /customers (search with query params)
    - Add GET /customers/:id
    - Add POST /customers
    - Add PUT /customers/:id
    - Add DELETE /customers/:id
    - Add GET /customers/:id/history
    - Add POST /customers/:id/vehicles
    - Add PATCH /customers/:id/loyalty
    - _Requirements: All API-dependent requirements_
  
  - [x] 23.2 Add customer seed data to mock-backend/db.json
    - Add 20-30 sample customers with complete profiles
    - Include customers with multiple vehicles
    - Include customers with service history
    - Include customers with loyalty programs at different tiers
    - Include customers with various communication preferences
    - _Requirements: All requirements (testing data)_

- [ ] 24. Final checkpoint - Integration testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 25. Create comprehensive documentation
  - [ ] 25.1 Document customer management API
    - Document all CustomerService methods
    - Document ValidationService methods
    - Document CustomerCacheRepository methods
    - Include usage examples
    - _Requirements: All requirements (documentation)_
  
  - [ ] 25.2 Create user guide for customer management
    - Document search workflows
    - Document customer creation/editing workflows
    - Document vehicle management workflows
    - Document service history viewing
    - Document loyalty program usage
    - Include screenshots and examples
    - _Requirements: All requirements (user documentation)_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each property test should run minimum 100 iterations using fast-check
- Property tests should be tagged with: **Feature: customer-management, Property N: [property text]**
- All components should follow Angular standalone component pattern
- All services should use dependency injection
- All data operations should support offline-first architecture
- Checkpoints ensure incremental validation and allow for user feedback
- Mock backend enables full-stack testing without external dependencies

