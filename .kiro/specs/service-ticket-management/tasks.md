# Implementation Plan: Service Ticket Management

## Overview

This implementation plan breaks down the Service Ticket Management feature into incremental coding tasks. Each task builds on previous work, with property-based tests integrated throughout to catch errors early. The implementation follows the existing Angular standalone component architecture and repository patterns established in the codebase.

The implementation will use TypeScript with Angular 17+ standalone components, following the same network-first caching strategy and offline support patterns used in Customer Management.

## Tasks

- [x] 1. Set up core infrastructure and data models
  - [x] 1.1 Create service ticket data models and interfaces
    - Create comprehensive TypeScript interfaces in `src/app/core/models/service-ticket.model.ts`
    - Include ServiceTicket, TicketLineItem, TicketStatus, TicketTotals, Discount, StatusHistoryEntry
    - Include search and filter interfaces (TicketSearchCriteria, TicketSummary)
    - Include cache models (CachedServiceTicket, QueuedTicketOperation)
    - _Requirements: All requirements (data foundation)_
  
  - [x] 1.2 Create service catalog data models
    - Create TypeScript interfaces in `src/app/core/models/service-catalog.model.ts`
    - Include ServiceCatalog, ServiceItem, ServiceCategory, PricingTier, PartInfo
    - Include recommendation models (ServiceRecommendation, MileageThreshold, TimeThreshold)
    - Include work order models (WorkOrder, WorkOrderService, WorkOrderPart)
    - _Requirements: 2.1, 2.6, 4.1, 4.2, 4.3, 10.1, 10.2_
  
  - [x]* 1.3 Write property tests for data model validation
    - **Property 101: Mileage Validation**
    - **Property 102: Quantity Validation**
    - **Property 103: Price Validation**
    - **Property 104: Discount Percentage Validation**
    - **Property 105: Discount Amount Validation**
    - Generate random valid/invalid inputs, verify validation logic
    - _Requirements: 17.4, 17.5, 17.6, 17.7, 17.8_

- [x] 2. Extend ValidationService for ticket-specific validation
  - [x] 2.1 Add ticket validation methods to ValidationService
    - Implement validateTicket (customer ID, vehicle ID, line items)
    - Implement validateLineItem (service ID, quantity, price)
    - Implement validateDiscount (type, value, subtotal)
    - Implement validateStatusTransition (current, new, user role)
    - Implement business rule methods (requiresManagerApproval, canEditTicket, canDeleteTicket)
    - _Requirements: 6.5, 8.3, 12.1, 12.2, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8_
  
  - [ ]* 2.2 Write property tests for ticket validation
    - **Property 98: Customer ID Validation**
    - **Property 99: Vehicle ID Validation**
    - **Property 100: Service Code Validation**
    - **Property 33: Invalid Status Transitions Rejected**
    - **Property 43: Large Discount Requires Manager Approval**
    - Generate random ticket data, test validation rules
    - _Requirements: 6.5, 8.3, 17.1, 17.2, 17.3_


- [x] 3. Implement ServiceCatalogCacheRepository
  - [x] 3.1 Create ServiceCatalogCacheRepository
    - Extend IndexedDBRepository pattern
    - Implement saveCatalog, getCatalog, getCatalogVersion methods
    - Implement getServiceById, getServicesByCategory, searchServices methods
    - Implement catalog metadata tracking
    - Add indexes for efficient searching (category, serviceId, code)
    - _Requirements: 2.1, 2.7, 2.8_
  
  - [x] 3.2 Update IndexedDB schema for service catalog
    - Modify `src/app/core/repositories/indexeddb.repository.ts` onupgradeneeded
    - Create service-catalog object store with serviceId keyPath
    - Create catalog-metadata object store for version tracking
    - Add indexes: category, code, name
    - _Requirements: 2.7_
  
  - [ ]* 3.3 Write property tests for catalog caching
    - **Property 11: Catalog Caching on Load**
    - **Property 12: Offline Service Addition Uses Cache**
    - Generate random catalogs, test caching and retrieval
    - _Requirements: 2.7, 2.8_

- [x] 4. Implement ServiceTicketCacheRepository with LRU eviction
  - [x] 4.1 Create ServiceTicketCacheRepository
    - Extend IndexedDBRepository pattern
    - Implement save, getById, update, delete methods
    - Implement search methods (by ticket number, customer, vehicle, status, technician, date range)
    - Track lastAccessedAt timestamp for LRU
    - Track accessCount for analytics
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 16.1, 16.7_
  
  - [x] 4.2 Implement LRU eviction logic
    - Implement evictOldest method with 80% trigger threshold
    - Evict until storage below 70% capacity
    - Protect tickets in sync queue from eviction
    - Protect Created/In_Progress tickets (evict Completed/Paid first)
    - Log evicted ticket numbers for audit
    - Implement updateAccessTime method
    - _Requirements: 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_
  
  - [x] 4.3 Update IndexedDB schema for service tickets
    - Create service-tickets object store with ticketId keyPath
    - Add indexes: ticketNumber, customerId, vehicleId, status, technicianId, createdDate, lastAccessedAt
    - Create ticket-queue object store for offline operations
    - _Requirements: 1.6, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_
  
  - [ ]* 4.4 Write property tests for ticket caching
    - **Property 3: Ticket Creation Assigns Unique ID and Initial State**
    - **Property 91: Access Time Tracking**
    - **Property 97: Access Updates Timestamp**
    - **Property 106: IndexedDB Serialization Round-Trip**
    - Generate random tickets, test caching and retrieval
    - _Requirements: 1.6, 16.1, 16.7, 19.1, 19.2_
  
  - [ ]* 4.5 Write property tests for LRU eviction
    - **Property 92: LRU Eviction Trigger at 80% Capacity**
    - **Property 93: LRU Eviction Removes Least Recently Accessed**
    - **Property 94: Queued Tickets Protected from Eviction**
    - **Property 95: Active Tickets Protected from Eviction**
    - **Property 96: Eviction Audit Logging**
    - Generate random ticket sets, test eviction behavior
    - _Requirements: 16.2, 16.3, 16.4, 16.5, 16.6_

- [x] 5. Implement pricing calculation engine
  - [x] 5.1 Create pricing calculation service
    - Implement calculateTicketTotals function
    - Implement line total calculation (price × quantity)
    - Implement subtotal calculation (sum of line totals)
    - Implement parts/labor separation and totals
    - Implement tax calculation (subtotal × tax rate)
    - Implement discount calculation (percentage and amount types)
    - Implement total calculation (subtotal + tax - discounts)
    - Implement rounding to 2 decimal places
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.1, 7.2, 7.5, 8.2, 9.2, 9.3_
  
  - [ ]* 5.2 Write property tests for pricing calculations
    - **Property 13: Line Total Calculation**
    - **Property 14: Subtotal Calculation**
    - **Property 15: Tax Calculation**
    - **Property 16: Tax Rounding to 2 Decimals**
    - **Property 17: Total Calculation**
    - **Property 38: Parts and Labor Subtotals**
    - **Property 41: Total Labor Hours Calculation**
    - **Property 42: Percentage Discount Calculation**
    - Generate random line items, prices, tax rates, discounts
    - Verify all calculation formulas
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.2, 7.5, 8.2, 9.2, 9.3_
  
  - [ ]* 5.3 Write property tests for discount operations
    - **Property 45: Discount Application Recalculates Total**
    - **Property 46: Discount Removal Restores Original Total**
    - **Property 47: Multiple Discounts Sequential Calculation**
    - Generate random tickets and discounts, test round-trip
    - _Requirements: 3.6, 8.5, 8.6, 8.7_

- [x] 6. Checkpoint - Ensure pricing calculations are correct
  - Ensure all tests pass, ask the user if questions arise.


- [x] 7. Implement ServiceTicketService with network-first strategy
  - [x] 7.1 Create ServiceTicketService with ticket CRUD operations
    - Implement createTicket with validation and caching
    - Implement getTicketById with network-first fallback
    - Implement updateTicket with validation
    - Implement deleteTicket (only for Created status)
    - Integrate with ServiceTicketCacheRepository
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 12.1, 12.2, 12.5_
  
  - [x] 7.2 Implement ticket search and listing operations
    - Implement searchTickets with multiple criteria support
    - Implement getTicketsByStatus
    - Implement getTicketsByTechnician
    - Implement getTicketsByDateRange
    - Implement network-first with cache fallback
    - Implement sorting (creation date descending)
    - Implement pagination (50 per page)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_
  
  - [x] 7.3 Implement offline queueing for ticket operations
    - Queue create/update/delete operations when offline
    - Use RequestQueueRepository for persistence
    - Generate unique operation IDs for idempotency
    - Implement syncPendingTickets method
    - _Requirements: 1.8, 12.7, 15.2, 15.3_
  
  - [ ]* 7.4 Write property tests for ticket CRUD
    - **Property 4: Ticket Creation Records Creating Employee**
    - **Property 5: Offline Ticket Creation Queues for Sync**
    - **Property 73: Ticket Save Validates and Persists**
    - **Property 75: Offline Ticket Edits Queue for Sync**
    - Generate random tickets, test operations
    - _Requirements: 1.7, 1.8, 12.5, 12.7_
  
  - [ ]* 7.5 Write property tests for ticket search
    - **Property 60: Ticket List Sorted by Creation Date**
    - **Property 61: Ticket Number Search Exact Match**
    - **Property 62: Customer Name Search Returns All Matches**
    - **Property 63: Vehicle Search Returns All Matches**
    - **Property 64: Status Filter Returns Only Matching Tickets**
    - **Property 65: Date Range Filter Returns Only Tickets in Range**
    - **Property 66: Technician Filter Returns Only Assigned Tickets**
    - **Property 67: Pagination with 50 Items Per Page**
    - **Property 68: Offline Search Uses Cache**
    - Generate random ticket databases and search criteria
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9_

- [-] 8. Implement service catalog operations
  - [x] 8.1 Add catalog operations to ServiceTicketService
    - Implement getServiceCatalog with caching
    - Implement getServicesByCategory
    - Implement getServiceById
    - Load catalog on first access, cache to IndexedDB
    - Implement catalog version checking and refresh
    - _Requirements: 2.1, 2.7, 2.8_
  
  - [ ] 8.2 Create service catalog seed data
    - Add comprehensive service catalog to mock-backend/db.json
    - Include all 8 categories (Oil_Change, Fluid_Services, Filters, Battery, Wipers, Lights, Tires, Inspection)
    - Include 50-100 service items with pricing, labor times, parts
    - Include pricing tiers for different vehicle types
    - _Requirements: 2.1, 2.6_
  
  - [ ]* 8.3 Write property tests for catalog operations
    - **Property 10: Pricing Tier Selection Based on Vehicle**
    - Generate random vehicles and services with tiers, verify correct tier selection
    - _Requirements: 2.6_

- [x] 9. Implement ticket line item operations
  - [x] 9.1 Add line item operations to ServiceTicketService
    - Implement addLineItem with service lookup and defaults
    - Implement duplicate service detection (increment quantity instead of adding new)
    - Implement updateLineItem (quantity, price changes)
    - Implement removeLineItem
    - Trigger pricing recalculation after each operation
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.1, 3.2_
  
  - [ ]* 9.2 Write property tests for line item operations
    - **Property 6: Adding Service Creates Line Item with Defaults**
    - **Property 7: Adding Duplicate Service Increments Quantity**
    - **Property 8: Removing Line Item Updates Ticket**
    - **Property 9: Quantity Change Recalculates Totals**
    - **Property 37: Service Item Parts and Labor Separation**
    - Generate random services and operations, verify behavior
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 7.1_


- [x] 10. Implement status workflow management
  - [x] 10.1 Add status operations to ServiceTicketService
    - Implement updateTicketStatus with transition validation
    - Implement startWork (Created → In_Progress)
    - Implement completeWork (In_Progress → Completed)
    - Implement markPaid (Completed → Paid)
    - Record timestamps for each transition
    - Add status history entries
    - Prevent edits for Completed/Paid tickets
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  
  - [ ]* 10.2 Write property tests for status workflow
    - **Property 31: New Ticket Status is Created**
    - **Property 32: Valid Status Transitions**
    - **Property 34: Status Change History Logging**
    - **Property 35: Completed/Paid Tickets Prevent Edits**
    - **Property 69: Editable Tickets Allow Modifications**
    - **Property 70: Completed/Paid Tickets Prevent Edits**
    - Generate random tickets and status transitions, verify workflow rules
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 12.1, 12.2_

- [x] 11. Implement discount management
  - [x] 11.1 Add discount operations to ServiceTicketService
    - Implement applyDiscount with type support (percentage, amount)
    - Implement manager approval check (>10% threshold)
    - Implement removeDiscount
    - Record discount metadata (appliedBy, approvedBy, timestamps)
    - Trigger pricing recalculation
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  
  - [ ]* 11.2 Write property tests for discount management
    - **Property 18: Discount Application Recalculates Total**
    - **Property 44: Manager Approval Recording**
    - **Property 48: Offline Discount Authorization Queues**
    - Generate random discounts and tickets, verify calculations and approval logic
    - _Requirements: 8.3, 8.4, 8.5, 8.8_

- [x] 12. Implement tax calculation
  - [x] 12.1 Add tax calculation to pricing engine
    - Load tax rate from store configuration
    - Calculate tax as (subtotal - discounts) × tax rate
    - Implement tax-exempt service handling
    - Round tax to 2 decimal places
    - Preserve original tax rate for existing tickets
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ]* 12.2 Write property tests for tax calculation
    - **Property 49: Tax Rate Loading**
    - **Property 50: Subtotal Change Recalculates Tax**
    - **Property 51: Tax Rounding Standard Rules**
    - **Property 52: Tax-Exempt Services Excluded from Taxable Subtotal**
    - **Property 53: Tax Rate Update Preserves Existing Tickets**
    - Generate random subtotals and tax rates, verify calculations
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 13. Checkpoint - Ensure core ticket operations work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement service recommendation engine
  - [x] 14.1 Create recommendation service
    - Implement getServiceRecommendations (mileage and time-based)
    - Load mileage thresholds (oil change: 3000-7500 miles, air filter: 15000, etc.)
    - Load time thresholds (oil change: 6 months, battery: 12 months, etc.)
    - Analyze service history to find last performed dates/mileage
    - Calculate due services based on thresholds
    - Prioritize recommendations (High/Medium/Low)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 14.2 Implement upsell recommendation engine
    - Implement getUpsellRecommendations
    - Define upsell rules (oil change → filters/wipers, battery → terminal cleaning, etc.)
    - Check if recommended services already on ticket
    - Exclude recently performed services
    - Prioritize by customer value and urgency
    - _Requirements: 14.1, 14.2, 14.5, 14.6_
  
  - [ ]* 14.3 Write property tests for recommendations
    - **Property 20: Mileage-Based Recommendations**
    - **Property 21: Time-Based Recommendations**
    - **Property 22: Recommendation Display Completeness**
    - **Property 81: Oil Change Triggers Related Recommendations**
    - **Property 83: Upsell Prioritization**
    - **Property 84: Recently Performed Services Excluded from Upsells**
    - Generate random vehicles, service histories, and tickets
    - Verify recommendation logic
    - _Requirements: 4.2, 4.3, 4.4, 14.1, 14.5, 14.6_

- [x] 15. Implement technician assignment
  - [x] 15.1 Add technician operations to ServiceTicketService
    - Implement assignTechnician with timestamp recording
    - Implement getEstimatedCompletionTime (based on total labor minutes)
    - Track technician change history
    - Filter tickets by technician
    - Sort technician tickets by creation time
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 15.2 Write property tests for technician assignment
    - **Property 26: Technician Assignment Records Timestamp**
    - **Property 27: Technician Change Preserves History**
    - **Property 28: Estimated Completion Time Calculation**
    - **Property 29: Technician Ticket Filtering and Sorting**
    - **Property 30: Offline Technician Assignment Queues for Sync**
    - Generate random technician assignments, verify behavior
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.7_


- [x] 16. Implement work order generation and printing
  - [x] 16.1 Create work order generation service
    - Implement generateWorkOrder function
    - Load customer and vehicle details
    - Build services list with labor times
    - Build parts list from line items
    - Calculate labor summary (total minutes, hours, estimated completion)
    - Build pricing summary (subtotal, tax, discounts, total)
    - Generate barcode data (ticket number)
    - _Requirements: 10.1, 10.2, 10.3, 10.6_
  
  - [x] 16.2 Create work order print template
    - Create printable HTML template for work orders
    - Include store header with logo and contact info
    - Include customer and vehicle information
    - Include service checklist with checkboxes
    - Include parts list
    - Include pricing summary
    - Include signature lines for customer authorization
    - Include barcode/QR code
    - Format for 8.5x11 inch paper
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [x] 16.3 Implement print functionality
    - Implement printWorkOrder method
    - Generate print-friendly HTML
    - Trigger browser print dialog
    - Support offline printing with cached data
    - _Requirements: 10.1, 10.7_
  
  - [ ]* 16.4 Write property tests for work order generation
    - **Property 55: Work Order Completeness**
    - **Property 56: Work Order Signature Line**
    - **Property 57: Work Order Header Information**
    - **Property 58: Work Order Barcode Contains Ticket Number**
    - **Property 59: Offline Work Order Uses Cache**
    - Generate random tickets, verify work order content
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6, 10.7_

- [x] 17. Implement service history integration
  - [x] 17.1 Add service history operations to ServiceTicketService
    - Integrate with CustomerService to retrieve service history
    - Implement getServiceHistoryForVehicle
    - Display last performed date/mileage for services in catalog
    - Highlight due services in catalog
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.6_
  
  - [ ]* 17.2 Write property tests for service history integration
    - **Property 76: Vehicle Selection Retrieves Service History**
    - **Property 77: Service History Display Completeness**
    - **Property 78: Previously Performed Service Shows Last Date**
    - **Property 79: Due Services Highlighted in Catalog**
    - **Property 80: Offline Service History Uses Cache**
    - Generate random vehicles and service histories, verify integration
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.6_

- [x] 18. Implement TicketFormComponent
  - [x] 18.1 Create ticket form component with customer/vehicle selection
    - Create reactive form for ticket creation
    - Implement customer search/selection dropdown
    - Implement vehicle selection dropdown (filtered by customer)
    - Pre-populate vehicle details on selection
    - Add current mileage input
    - Display service recommendations panel
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 18.2 Integrate service catalog and selection
    - Display service catalog with category tabs
    - Implement service search within catalog
    - Add service to ticket on click
    - Display selected services list with quantities
    - Show last performed date/mileage for each service
    - Highlight due services
    - _Requirements: 2.1, 2.2, 2.3, 13.3, 13.4_
  
  - [x] 18.3 Implement real-time pricing display
    - Display ticket summary with line items
    - Show subtotal, tax, discounts, total
    - Show parts vs labor breakdown
    - Update calculations in real-time as services added/removed
    - Format currency with $ and 2 decimals
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 7.2_
  
  - [x] 18.4 Add discount and technician assignment
    - Implement discount application UI (percentage or amount)
    - Show manager approval indicator for large discounts
    - Implement technician selection dropdown
    - Show estimated completion time
    - _Requirements: 5.1, 5.2, 5.4, 8.1, 8.2, 8.3_
  
  - [x] 18.5 Implement form submission and validation
    - Validate required fields (customer, vehicle)
    - Call ServiceTicketService createTicket
    - Display success confirmation
    - Handle validation errors
    - Show offline indicator and queueing feedback
    - Navigate to ticket detail on success
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8_
  
  - [ ]* 18.6 Write property tests for ticket form
    - **Property 1: Customer Selection Loads All Vehicles**
    - **Property 2: Vehicle Selection Pre-populates Details**
    - **Property 71: Service Changes Recalculate Totals**
    - **Property 72: Mileage Change Updates Recommendations**
    - Generate random form interactions, verify behavior
    - _Requirements: 1.2, 1.3, 12.3, 12.4_


- [x] 19. Implement TicketListComponent
  - [x] 19.1 Create ticket list component with search and filters
    - Display ticket list with status indicators
    - Implement search input (ticket number, customer name, VIN)
    - Implement status filter dropdown
    - Implement date range filter
    - Implement technician filter dropdown
    - Sort tickets by creation date descending
    - Implement pagination (50 per page)
    - Add "Create New Ticket" button
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_
  
  - [x] 19.2 Add ticket list actions
    - Add "View Details" button per ticket
    - Add "Print Work Order" quick action
    - Add status badge with color coding
    - Show ticket summary info (customer, vehicle, total, service count)
    - Add loading state during search
    - _Requirements: 11.1_
  
  - [ ]* 19.3 Write unit tests for TicketListComponent
    - Test empty ticket list display
    - Test ticket rendering with various statuses
    - Test filter application
    - Test pagination behavior
    - _Requirements: 11.1, 11.8_

- [x] 20. Implement TicketDetailComponent
  - [x] 20.1 Create ticket detail component
    - Display complete ticket information
    - Show customer and vehicle summary sections
    - Display service line items with pricing
    - Show parts and labor breakdown
    - Display status timeline with history
    - Show technician assignment
    - Display recommendations panel
    - Add action buttons (Edit, Print, Change Status)
    - _Requirements: 4.1, 4.4, 6.6, 7.2, 7.3, 7.4_
  
  - [x] 20.2 Implement ticket detail actions
    - Implement edit navigation (only for Created/In_Progress)
    - Implement status change actions (Start Work, Complete, Mark Paid)
    - Implement print work order
    - Show offline indicator
    - Show pending sync indicator
    - _Requirements: 6.2, 6.3, 6.4, 10.1, 12.1, 12.2, 15.5, 15.6_
  
  - [ ]* 20.3 Write unit tests for TicketDetailComponent
    - Test ticket rendering with complete data
    - Test action button visibility based on status
    - Test status change workflows
    - Test offline indicators
    - _Requirements: 6.7, 12.1, 12.2, 15.5, 15.6_

- [x] 21. Implement ServiceCatalogComponent and ServiceSelectorComponent
  - [x] 21.1 Create ServiceCatalogComponent
    - Display service catalog with category navigation
    - Implement category tabs (8 categories)
    - Display service cards with name, description, price, labor time
    - Implement service search
    - Show service details on hover
    - Add "Add to Ticket" action per service
    - _Requirements: 2.1_
  
  - [x] 21.2 Create ServiceSelectorComponent for quick selection
    - Display selected services list
    - Show quantity adjustment controls
    - Show line totals
    - Add remove action per line item
    - Update in real-time as services added/removed
    - _Requirements: 2.2, 2.3, 2.4, 2.5_
  
  - [ ]* 21.3 Write unit tests for catalog components
    - Test catalog rendering with all categories
    - Test service search
    - Test service addition
    - Test quantity adjustment
    - _Requirements: 2.1, 2.2, 2.5_

- [x] 22. Implement RecommendationPanelComponent
  - [x] 22.1 Create recommendation panel component
    - Display mileage-based recommendations
    - Display time-based recommendations
    - Display upsell recommendations
    - Show reason for each recommendation
    - Show last performed date/mileage
    - Show priority indicators (High/Medium/Low)
    - Add "Accept" and "Dismiss" actions per recommendation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 14.1, 14.2_
  
  - [x] 22.2 Implement recommendation actions
    - Accept recommendation → add service to ticket
    - Dismiss recommendation → remove from list (temporary)
    - Update recommendations when mileage changes
    - Show empty state when no recommendations
    - _Requirements: 4.5, 4.6, 4.7, 12.4_
  
  - [ ]* 22.3 Write property tests for recommendations
    - **Property 23: Accepting Recommendations Adds Services**
    - **Property 24: Dismissing Recommendations Removes from List**
    - **Property 25: Offline Recommendations Use Cache**
    - Generate random recommendations and actions, verify behavior
    - _Requirements: 4.5, 4.6, 4.8, 14.3, 14.4_


- [x] 23. Implement TechnicianSelectorComponent
  - [x] 23.1 Create technician selector component
    - Display available technicians list
    - Show current workload indicator per technician
    - Show estimated completion time for ticket
    - Implement technician selection
    - Display unassigned indicator when no technician
    - _Requirements: 5.1, 5.4, 5.6_
  
  - [ ]* 23.2 Write unit tests for TechnicianSelectorComponent
    - Test technician list rendering
    - Test selection behavior
    - Test unassigned state display
    - _Requirements: 5.1, 5.6_

- [x] 24. Implement TicketSummaryComponent
  - [x] 24.1 Create ticket summary component
    - Display line items list with quantities and prices
    - Display subtotal with parts/labor breakdown
    - Display tax calculation with rate and amount
    - Display discounts with approval status
    - Display total prominently
    - Format all currency values consistently
    - Align decimal points for easy scanning
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 7.2, 9.6, 20.7_
  
  - [ ]* 24.2 Write property tests for ticket summary
    - **Property 19: Currency Formatting**
    - **Property 54: Tax Display Shows Rate and Amount**
    - Generate random tickets, verify display formatting
    - _Requirements: 3.8, 9.6_

- [x] 25. Implement WorkOrderPrintComponent
  - [x] 25.1 Create work order print component
    - Create print-optimized layout
    - Display all work order sections (customer, vehicle, services, parts, labor, pricing)
    - Include service checklist with checkboxes
    - Include signature lines
    - Include barcode/QR code
    - Include store header with logo
    - _Requirements: 10.2, 10.3, 10.5, 10.6_
  
  - [ ]* 25.2 Write unit tests for work order printing
    - Test work order rendering with complete data
    - Test barcode generation
    - Test offline printing
    - _Requirements: 10.1, 10.7_

- [x] 26. Checkpoint - Ensure all components render and interact correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 27. Implement offline synchronization
  - [x] 27.1 Implement sync service for ticket operations
    - Implement syncPendingTickets method
    - Process queue in chronological order
    - Implement exponential backoff for retries
    - Handle operation idempotency (use operation IDs)
    - Update cache with server IDs after successful sync
    - _Requirements: 15.3_
  
  - [x] 27.2 Implement conflict resolution
    - Detect synchronization conflicts
    - Apply server-authoritative resolution
    - Display conflict notification dialog
    - Update local cache with server data
    - _Requirements: 15.4_
  
  - [ ]* 27.3 Write property tests for synchronization
    - **Property 86: Offline Operations Queued**
    - **Property 87: Sync Queue Chronological Processing**
    - **Property 88: Sync Conflict Server Authority**
    - Generate random offline operations and conflicts, verify sync behavior
    - _Requirements: 15.2, 15.3, 15.4_

- [x] 28. Implement offline indicators and status management
  - [x] 28.1 Add offline indicators to all ticket components
    - Add offline badge to TicketDetailComponent
    - Add pending sync indicator for modified tickets
    - Add offline message for catalog/data unavailable scenarios
    - Integrate with NetworkDetectionService
    - _Requirements: 15.5, 15.6, 15.7, 15.8_
  
  - [ ]* 28.2 Write property tests for offline indicators
    - **Property 85: Offline Operations Continue with Cache**
    - **Property 89: Offline Access Indicator**
    - **Property 90: Pending Sync Indicator**
    - Generate random offline scenarios, verify indicators
    - _Requirements: 15.1, 15.5, 15.6_

- [x] 29. Implement API serialization with round-trip validation
  - [x] 29.1 Ensure proper JSON serialization for API calls
    - Verify ServiceTicket serialization to JSON
    - Verify JSON deserialization to ServiceTicket
    - Implement ISO 8601 date formatting for all date fields
    - Implement currency precision handling (exactly 2 decimal places)
    - Handle nested objects (line items, discounts, status history)
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_
  
  - [ ]* 29.2 Write property tests for serialization
    - **Property 107: API Serialization Round-Trip**
    - **Property 108: ISO 8601 Date Format**
    - **Property 109: Currency Precision Preservation**
    - Generate random ticket objects, test round-trip
    - _Requirements: 19.3, 19.4, 19.5, 19.6_


- [x] 30. Implement UI/UX enhancements and accessibility
  - [x] 30.1 Add touch-friendly styling and interactions
    - Ensure all buttons meet 44x44 pixel minimum touch target
    - Add touch feedback animations (ripple effects)
    - Implement large, clear typography
    - Add keyboard shortcuts (Enter to submit, Escape to cancel, Ctrl+S to save)
    - Implement tab navigation with logical order
    - _Requirements: 20.3, 20.6_
  
  - [x] 30.2 Implement loading states and user feedback
    - Add loading spinners for async operations
    - Add success toast notifications (3 second duration)
    - Add error toast notifications with actionable messages
    - Add skeleton loaders for data fetching
    - Implement focus states and hover effects
    - _Requirements: 20.2, 20.4, 20.5_
  
  - [ ]* 30.3 Write property tests for UI requirements
    - **Property 110: Touch Target Minimum Size**
    - **Property 111: Success Confirmation Display Duration**
    - **Property 112: Error Message Display**
    - **Property 113: Keyboard Navigation Support**
    - Verify UI elements meet requirements
    - _Requirements: 20.3, 20.4, 20.5, 20.6_

- [x] 31. Apply Valvoline enterprise POS styling
  - [x] 31.1 Create ticket management component styles
    - Apply Valvoline brand colors and typography
    - Match styling from https://pos.vioc.com/viocpos-cwa-admin/login.do
    - Implement consistent spacing and layout
    - Add status color coding (Created: blue, In_Progress: yellow, Completed: green, Paid: gray)
    - Implement responsive design for tablets
    - Use clear visual hierarchy with category headers
    - _Requirements: 20.1, 20.8_
  
  - [x] 31.2 Implement currency value alignment
    - Align decimal points in pricing displays
    - Use monospace font for currency values
    - Implement consistent currency formatting across all components
    - _Requirements: 20.7_

- [x] 32. Wire components together and implement routing
  - [x] 32.1 Create service ticket feature routing module
    - Define routes: /tickets (list), /tickets/new (create), /tickets/:id (detail), /tickets/:id/edit (edit)
    - Implement route guards for authentication
    - Add navigation between components
    - Preserve search/filter context in navigation
    - _Requirements: 11.1, 12.1_
  
  - [x] 32.2 Integrate ticket module into main application
    - Add ticket routes to app routing
    - Add "Service Tickets" navigation link to main menu
    - Ensure lazy loading for ticket module
    - Add quick action from customer detail to create ticket
    - _Requirements: 1.1_

- [ ] 33. Update mock backend API with ticket endpoints
  - [ ] 33.1 Add ticket endpoints to mock-backend/server.js
    - Add GET /tickets (search with query params)
    - Add GET /tickets/:id
    - Add POST /tickets
    - Add PUT /tickets/:id
    - Add DELETE /tickets/:id
    - Add PATCH /tickets/:id/status
    - Add GET /tickets/:id/recommendations
    - Add GET /service-catalog
    - _Requirements: All API-dependent requirements_
  
  - [ ] 33.2 Add ticket and catalog seed data to mock-backend/db.json
    - Add comprehensive service catalog (50-100 services across 8 categories)
    - Add 30-50 sample tickets with various statuses
    - Include tickets with multiple line items
    - Include tickets with discounts and manager approvals
    - Include tickets assigned to different technicians
    - Link tickets to existing customers and vehicles
    - _Requirements: All requirements (testing data)_

- [ ] 34. Implement manager approval workflow
  - [ ] 34.1 Create discount approval dialog component
    - Display discount details (amount, percentage, reason)
    - Show ticket summary
    - Add approve/reject actions
    - Record manager ID and timestamp on approval
    - Prevent ticket completion until approval received
    - _Requirements: 8.3, 8.4, 8.8_
  
  - [ ]* 34.2 Write unit tests for approval workflow
    - Test approval dialog display
    - Test approval recording
    - Test rejection handling
    - Test offline approval queueing
    - _Requirements: 8.3, 8.4, 8.8_

- [ ] 35. Final checkpoint - Integration testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 36. Create comprehensive documentation
  - [ ] 36.1 Document service ticket management API
    - Document all ServiceTicketService methods
    - Document pricing calculation logic
    - Document recommendation engine
    - Document status workflow rules
    - Include usage examples and code snippets
    - _Requirements: All requirements (documentation)_
  
  - [ ] 36.2 Create user guide for service ticket management
    - Document ticket creation workflow
    - Document service selection and catalog usage
    - Document discount application and approval
    - Document status workflow and technician assignment
    - Document work order printing
    - Document offline operation and synchronization
    - Include screenshots and examples
    - _Requirements: All requirements (user documentation)_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each property test should run minimum 100 iterations using fast-check
- Property tests should be tagged with: **Feature: service-ticket-management, Property N: [property text]**
- All components should follow Angular standalone component pattern
- All services should use dependency injection
- All data operations should support offline-first architecture
- Pricing calculations must be precise to 2 decimal places
- Status workflow must enforce valid transitions
- LRU eviction must protect active tickets and queued operations
- Checkpoints ensure incremental validation and allow for user feedback
- Mock backend enables full-stack testing without external dependencies
- Integration with Customer Management and Vehicle services is critical

