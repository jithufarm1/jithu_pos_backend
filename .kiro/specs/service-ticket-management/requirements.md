# Requirements Document

## Introduction

The Service Ticket Management module is the core operational component of the Valvoline Instant Oil Change POS PWA application. It enables technicians and service advisors to create, manage, and complete service tickets throughout the customer service lifecycle. This module handles service selection from a comprehensive catalog, real-time pricing calculations, technician assignments, status workflow management, parts and labor tracking, and offline operation support. The system integrates with customer and vehicle data to provide service recommendations, track service history, and ensure accurate billing.

## Glossary

- **Service_Ticket_System**: The software module responsible for all service ticket operations in the Valvoline POS application
- **Service_Ticket**: A complete record of services to be performed or completed for a customer's vehicle, including customer info, vehicle info, selected services, parts, labor, pricing, and status
- **Service_Catalog**: The master list of all available services with associated pricing, labor times, and service codes
- **Service_Item**: An individual service offering in the catalog (e.g., "Conventional Oil Change", "Air Filter Replacement")
- **Ticket_Line_Item**: A specific service added to a Service_Ticket with quantity, price, and labor time
- **Ticket_Status**: The current state of a Service_Ticket in the workflow (Created, In_Progress, Completed, Paid)
- **Labor_Time**: The estimated time in minutes required to complete a service
- **Service_Recommendation**: A suggested service based on vehicle mileage, service history, or manufacturer guidelines
- **Technician_Assignment**: The association of a specific technician to a Service_Ticket for accountability and workload tracking
- **Discount_Authorization**: Manager approval required for applying discounts beyond standard thresholds
- **Tax_Rate**: The applicable sales tax percentage based on store location
- **Subtotal**: The sum of all Ticket_Line_Item prices before tax and discounts
- **Total**: The final amount due including services, parts, tax, and discounts
- **Work_Order**: A printable document containing all Service_Ticket details for technician reference
- **Service_History**: Historical record of all services performed on a specific vehicle
- **Mileage_Threshold**: Manufacturer-recommended mileage intervals for specific services
- **Offline_Queue**: Local storage of pending operations to be synchronized when connectivity is restored
- **IndexedDB**: Browser-based local database for offline data storage
- **LRU_Eviction**: Least Recently Used cache eviction strategy for managing storage limits

## Requirements

### Requirement 1: Service Ticket Creation

**User Story:** As a service advisor, I want to create new service tickets with customer and vehicle selection, so that I can initiate service for customers.

#### Acceptance Criteria

1. WHEN a service advisor initiates ticket creation, THE Service_Ticket_System SHALL display a form requiring customer selection and vehicle selection
2. WHEN a service advisor selects a customer, THE Service_Ticket_System SHALL load all vehicles associated with that customer
3. WHEN a service advisor selects a vehicle, THE Service_Ticket_System SHALL pre-populate vehicle details including VIN, year, make, model, and current mileage
4. WHEN a service advisor creates a ticket without selecting a customer, THE Service_Ticket_System SHALL prevent creation and display a validation error
5. WHEN a service advisor creates a ticket without selecting a vehicle, THE Service_Ticket_System SHALL prevent creation and display a validation error
6. WHEN a service advisor successfully creates a ticket, THE Service_Ticket_System SHALL assign a unique ticket number, set status to Created, record creation timestamp, and persist to IndexedDB
7. WHEN a service advisor creates a ticket, THE Service_Ticket_System SHALL automatically assign the current logged-in user as the creating employee
8. WHILE offline, WHEN a service advisor creates a ticket, THE Service_Ticket_System SHALL save locally and queue for synchronization when connectivity is restored

### Requirement 2: Service Selection and Catalog

**User Story:** As a service advisor, I want to add services from a comprehensive catalog, so that I can build accurate service tickets with proper pricing.

#### Acceptance Criteria

1. WHEN a service advisor views the Service_Catalog, THE Service_Ticket_System SHALL display all available services organized by category (Oil Change, Fluid Services, Filters, Battery, Wipers, Lights, Tires, Inspection)
2. WHEN a service advisor adds a Service_Item to a ticket, THE Service_Ticket_System SHALL create a Ticket_Line_Item with service name, price, Labor_Time, and quantity defaulted to 1
3. WHEN a service advisor adds a Service_Item already on the ticket, THE Service_Ticket_System SHALL increment the quantity of the existing Ticket_Line_Item
4. WHEN a service advisor removes a Ticket_Line_Item, THE Service_Ticket_System SHALL remove it from the ticket and recalculate totals
5. WHEN a service advisor changes the quantity of a Ticket_Line_Item, THE Service_Ticket_System SHALL recalculate the line total and ticket totals
6. WHEN a Service_Item has multiple pricing tiers based on vehicle type, THE Service_Ticket_System SHALL select the appropriate price based on the selected vehicle
7. WHEN the Service_Catalog is loaded, THE Service_Ticket_System SHALL cache all service data to IndexedDB for offline access
8. WHILE offline, WHEN a service advisor adds services, THE Service_Ticket_System SHALL use cached Service_Catalog data

### Requirement 3: Real-Time Pricing Calculation

**User Story:** As a service advisor, I want automatic price calculations, so that customers receive accurate quotes without manual computation.

#### Acceptance Criteria

1. WHEN a Ticket_Line_Item is added, THE Service_Ticket_System SHALL calculate the line total as price multiplied by quantity
2. WHEN any Ticket_Line_Item changes, THE Service_Ticket_System SHALL recalculate the Subtotal as the sum of all line totals
3. WHEN the Subtotal changes, THE Service_Ticket_System SHALL calculate tax as Subtotal multiplied by Tax_Rate
4. WHEN tax is calculated, THE Service_Ticket_System SHALL round the tax amount to 2 decimal places
5. WHEN the Subtotal or tax changes, THE Service_Ticket_System SHALL calculate the Total as Subtotal plus tax minus discounts
6. WHEN a discount is applied, THE Service_Ticket_System SHALL recalculate the Total and display the discount amount separately
7. WHEN all calculations are performed, THE Service_Ticket_System SHALL update the display within 100 milliseconds
8. WHEN currency values are displayed, THE Service_Ticket_System SHALL format them with dollar sign, commas for thousands, and exactly 2 decimal places

### Requirement 4: Service Recommendations

**User Story:** As a service advisor, I want automated service recommendations based on vehicle data, so that I can suggest appropriate services to customers.

#### Acceptance Criteria

1. WHEN a vehicle is selected for a ticket, THE Service_Ticket_System SHALL analyze Service_History and current mileage to generate recommendations
2. WHEN a vehicle's mileage exceeds a Mileage_Threshold for a service, THE Service_Ticket_System SHALL recommend that service with priority indicator
3. WHEN a vehicle has not received a service within the manufacturer-recommended time interval, THE Service_Ticket_System SHALL recommend that service
4. WHEN recommendations are displayed, THE Service_Ticket_System SHALL show service name, reason for recommendation, and last performed date
5. WHEN a service advisor accepts a recommendation, THE Service_Ticket_System SHALL add the recommended Service_Item to the ticket
6. WHEN a service advisor dismisses a recommendation, THE Service_Ticket_System SHALL remove it from the current recommendation list
7. WHEN no recommendations are available, THE Service_Ticket_System SHALL display a message indicating the vehicle is up-to-date on services
8. WHILE offline, WHEN recommendations are generated, THE Service_Ticket_System SHALL use cached Service_History and mileage data

### Requirement 5: Technician Assignment

**User Story:** As a service manager, I want to assign technicians to service tickets, so that I can track workload and accountability.

#### Acceptance Criteria

1. WHEN a service advisor creates or edits a ticket, THE Service_Ticket_System SHALL display a list of available technicians
2. WHEN a service advisor assigns a technician, THE Service_Ticket_System SHALL record the Technician_Assignment with timestamp
3. WHEN a service advisor changes the assigned technician, THE Service_Ticket_System SHALL update the Technician_Assignment and preserve the change history
4. WHEN a ticket is assigned to a technician, THE Service_Ticket_System SHALL calculate estimated completion time based on total Labor_Time
5. WHEN a technician views their assigned tickets, THE Service_Ticket_System SHALL display all tickets assigned to them sorted by creation time
6. WHEN a ticket has no technician assigned, THE Service_Ticket_System SHALL display an unassigned indicator
7. WHILE offline, WHEN a service advisor assigns a technician, THE Service_Ticket_System SHALL save locally and queue for synchronization

### Requirement 6: Ticket Status Workflow

**User Story:** As a technician, I want to update ticket status as work progresses, so that the team can track service completion.

#### Acceptance Criteria

1. WHEN a ticket is created, THE Service_Ticket_System SHALL set Ticket_Status to Created
2. WHEN a technician starts work on a ticket, THE Service_Ticket_System SHALL allow status change from Created to In_Progress and record the start timestamp
3. WHEN a technician completes work on a ticket, THE Service_Ticket_System SHALL allow status change from In_Progress to Completed and record the completion timestamp
4. WHEN payment is processed for a ticket, THE Service_Ticket_System SHALL allow status change from Completed to Paid and record the payment timestamp
5. WHEN a status change is invalid (e.g., Created to Paid), THE Service_Ticket_System SHALL prevent the change and display an error message
6. WHEN a ticket status changes, THE Service_Ticket_System SHALL record the status change in a history log with timestamp and employee ID
7. WHEN a ticket is in Completed or Paid status, THE Service_Ticket_System SHALL prevent modifications to services or pricing
8. WHILE offline, WHEN a technician updates ticket status, THE Service_Ticket_System SHALL save locally and queue for synchronization

### Requirement 7: Parts and Labor Tracking

**User Story:** As a service manager, I want to track parts and labor separately, so that I can analyze costs and profitability.

#### Acceptance Criteria

1. WHEN a Service_Item is added to a ticket, THE Service_Ticket_System SHALL separate the price into parts cost and labor cost based on Service_Catalog configuration
2. WHEN ticket totals are calculated, THE Service_Ticket_System SHALL display separate subtotals for parts and labor
3. WHEN a Ticket_Line_Item includes parts, THE Service_Ticket_System SHALL track part numbers and quantities
4. WHEN labor is tracked, THE Service_Ticket_System SHALL record the Labor_Time in minutes for each service
5. WHEN a ticket is completed, THE Service_Ticket_System SHALL calculate total labor hours as the sum of all Labor_Time values divided by 60
6. WHEN parts are added manually, THE Service_Ticket_System SHALL allow entry of part number, description, quantity, and unit price
7. WHEN labor is added manually, THE Service_Ticket_System SHALL allow entry of description, time in minutes, and hourly rate

### Requirement 8: Discount Management

**User Story:** As a service advisor, I want to apply discounts to tickets, so that I can honor promotions and resolve customer concerns.

#### Acceptance Criteria

1. WHEN a service advisor applies a discount, THE Service_Ticket_System SHALL allow entry of discount amount or percentage
2. WHEN a discount percentage is entered, THE Service_Ticket_System SHALL calculate the discount amount as Subtotal multiplied by percentage
3. WHEN a discount amount exceeds 10% of Subtotal, THE Service_Ticket_System SHALL require Discount_Authorization from a manager
4. WHEN a manager approves a discount, THE Service_Ticket_System SHALL record the manager's employee ID and approval timestamp
5. WHEN a discount is applied, THE Service_Ticket_System SHALL recalculate the Total and display the discount amount separately
6. WHEN a discount is removed, THE Service_Ticket_System SHALL recalculate the Total to the original amount
7. WHEN multiple discounts are applied, THE Service_Ticket_System SHALL calculate them sequentially and display each discount separately
8. WHILE offline, WHEN a discount requiring authorization is applied, THE Service_Ticket_System SHALL queue the authorization request and prevent ticket completion until synchronized

### Requirement 9: Tax Calculation

**User Story:** As a service advisor, I want automatic tax calculation, so that tickets include correct tax amounts based on store location.

#### Acceptance Criteria

1. WHEN a ticket is created, THE Service_Ticket_System SHALL load the Tax_Rate for the current store location
2. WHEN the Subtotal changes, THE Service_Ticket_System SHALL recalculate tax as Subtotal multiplied by Tax_Rate
3. WHEN tax is calculated, THE Service_Ticket_System SHALL round to 2 decimal places using standard rounding rules
4. WHEN certain services are tax-exempt, THE Service_Ticket_System SHALL exclude those services from the taxable Subtotal
5. WHEN the Tax_Rate is updated, THE Service_Ticket_System SHALL apply the new rate to all new tickets and preserve the original rate for existing tickets
6. WHEN tax is displayed, THE Service_Ticket_System SHALL show both the Tax_Rate percentage and the calculated tax amount

### Requirement 10: Print Work Order

**User Story:** As a technician, I want to print service tickets, so that I have a physical reference while performing services.

#### Acceptance Criteria

1. WHEN a service advisor requests to print a Work_Order, THE Service_Ticket_System SHALL generate a formatted document containing all ticket details
2. WHEN a Work_Order is generated, THE Service_Ticket_System SHALL include ticket number, customer name, vehicle details, all services, parts list, labor times, pricing breakdown, and technician assignment
3. WHEN a Work_Order is generated, THE Service_Ticket_System SHALL include a signature line for customer authorization
4. WHEN a Work_Order is printed, THE Service_Ticket_System SHALL format the document for standard 8.5x11 inch paper
5. WHEN a Work_Order is printed, THE Service_Ticket_System SHALL include the store logo and contact information in the header
6. WHEN a Work_Order is printed, THE Service_Ticket_System SHALL include a barcode or QR code containing the ticket number for easy scanning
7. WHILE offline, WHEN a service advisor prints a Work_Order, THE Service_Ticket_System SHALL generate the document using cached data

### Requirement 11: Ticket Search and Listing

**User Story:** As a service advisor, I want to search and view existing tickets, so that I can track service progress and access historical tickets.

#### Acceptance Criteria

1. WHEN a service advisor views the ticket list, THE Service_Ticket_System SHALL display all tickets sorted by creation date descending
2. WHEN a service advisor searches by ticket number, THE Service_Ticket_System SHALL return the exact matching ticket
3. WHEN a service advisor searches by customer name, THE Service_Ticket_System SHALL return all tickets for customers with matching names
4. WHEN a service advisor searches by vehicle VIN or license plate, THE Service_Ticket_System SHALL return all tickets for that vehicle
5. WHEN a service advisor filters by Ticket_Status, THE Service_Ticket_System SHALL display only tickets matching that status
6. WHEN a service advisor filters by date range, THE Service_Ticket_System SHALL display only tickets created within that range
7. WHEN a service advisor filters by technician, THE Service_Ticket_System SHALL display only tickets assigned to that technician
8. WHEN ticket list results exceed 50 items, THE Service_Ticket_System SHALL implement pagination with 50 tickets per page
9. WHILE offline, WHEN a service advisor searches tickets, THE Service_Ticket_System SHALL search cached ticket data

### Requirement 12: Ticket Editing and Modification

**User Story:** As a service advisor, I want to edit service tickets before completion, so that I can adjust services based on inspection findings or customer requests.

#### Acceptance Criteria

1. WHEN a service advisor opens a ticket in Created or In_Progress status, THE Service_Ticket_System SHALL allow editing of services, parts, and labor
2. WHEN a service advisor attempts to edit a ticket in Completed or Paid status, THE Service_Ticket_System SHALL prevent editing and display a status message
3. WHEN a service advisor adds or removes services from an existing ticket, THE Service_Ticket_System SHALL recalculate all totals immediately
4. WHEN a service advisor changes vehicle mileage on a ticket, THE Service_Ticket_System SHALL update Service_Recommendations
5. WHEN a service advisor saves ticket changes, THE Service_Ticket_System SHALL validate all required fields and persist changes to IndexedDB
6. WHEN a service advisor changes the assigned technician, THE Service_Ticket_System SHALL update the Technician_Assignment and notify the new technician
7. WHILE offline, WHEN a service advisor edits a ticket, THE Service_Ticket_System SHALL save changes locally and queue for synchronization

### Requirement 13: Service History Integration

**User Story:** As a service advisor, I want to view vehicle service history while creating tickets, so that I can make informed service recommendations.

#### Acceptance Criteria

1. WHEN a vehicle is selected for a ticket, THE Service_Ticket_System SHALL retrieve and display the Service_History for that vehicle
2. WHEN Service_History is displayed, THE Service_Ticket_System SHALL show service date, services performed, mileage at service, and store location
3. WHEN a service has been performed previously, THE Service_Ticket_System SHALL display the last performed date and mileage next to that service in the catalog
4. WHEN a service is due based on Service_History, THE Service_Ticket_System SHALL highlight that service in the catalog with a due indicator
5. WHEN Service_History is unavailable, THE Service_Ticket_System SHALL display a message indicating no history found
6. WHILE offline, WHEN Service_History is requested, THE Service_Ticket_System SHALL display cached history data

### Requirement 14: Upsell Recommendations

**User Story:** As a service advisor, I want intelligent upsell recommendations, so that I can suggest additional services that benefit the customer.

#### Acceptance Criteria

1. WHEN a service advisor adds an oil change service, THE Service_Ticket_System SHALL recommend related services (air filter, cabin filter, wiper blades)
2. WHEN recommendations are displayed, THE Service_Ticket_System SHALL show the service name, reason for recommendation, and estimated price
3. WHEN a service advisor accepts an upsell recommendation, THE Service_Ticket_System SHALL add the service to the ticket
4. WHEN a service advisor dismisses an upsell recommendation, THE Service_Ticket_System SHALL remove it from the current recommendation list but not permanently
5. WHEN multiple upsell opportunities exist, THE Service_Ticket_System SHALL prioritize recommendations by customer value and service urgency
6. WHEN a recommended service was recently performed, THE Service_Ticket_System SHALL exclude it from upsell recommendations

### Requirement 15: Offline Support and Synchronization

**User Story:** As a service advisor, I want to create and manage tickets while offline, so that service operations continue during network outages.

#### Acceptance Criteria

1. WHEN the application goes offline, THE Service_Ticket_System SHALL continue allowing ticket creation and editing using cached data
2. WHEN the application goes offline, THE Service_Ticket_System SHALL queue all ticket operations in the Offline_Queue for later synchronization
3. WHEN the application regains connectivity, THE Service_Ticket_System SHALL automatically synchronize queued operations in chronological order
4. WHEN a synchronization conflict occurs, THE Service_Ticket_System SHALL apply server data as authoritative and notify the service advisor
5. WHEN ticket data is accessed offline, THE Service_Ticket_System SHALL display a visual indicator showing offline status
6. WHEN ticket data is modified offline, THE Service_Ticket_System SHALL display a visual indicator showing pending synchronization
7. WHEN the Service_Catalog is unavailable offline, THE Service_Ticket_System SHALL prevent ticket creation and display a message requiring connectivity for initial catalog download
8. WHEN customer or vehicle data is unavailable offline, THE Service_Ticket_System SHALL prevent ticket creation and display a message indicating required data is not cached

### Requirement 16: Cache Management

**User Story:** As a system architect, I want efficient cache management with LRU eviction, so that the system maintains performance within browser storage limits.

#### Acceptance Criteria

1. WHEN ticket data is stored to IndexedDB, THE Service_Ticket_System SHALL track the last access timestamp for each ticket
2. WHEN IndexedDB storage approaches the limit (80% capacity), THE Service_Ticket_System SHALL trigger LRU_Eviction
3. WHEN LRU_Eviction is triggered, THE Service_Ticket_System SHALL remove the least recently accessed tickets until storage is below 70% capacity
4. WHEN a ticket in Offline_Queue is targeted for eviction, THE Service_Ticket_System SHALL preserve that ticket until synchronization completes
5. WHEN a ticket in Created or In_Progress status is targeted for eviction, THE Service_Ticket_System SHALL preserve that ticket and evict older Completed or Paid tickets instead
6. WHEN eviction occurs, THE Service_Ticket_System SHALL log the evicted ticket numbers for audit purposes
7. WHEN a service advisor accesses a ticket, THE Service_Ticket_System SHALL update the last access timestamp to prevent premature eviction

### Requirement 17: Data Validation and Integrity

**User Story:** As a system administrator, I want strict data validation, so that service tickets maintain accuracy and consistency.

#### Acceptance Criteria

1. WHEN ticket data is entered, THE Service_Ticket_System SHALL validate that customer ID references an existing customer
2. WHEN ticket data is entered, THE Service_Ticket_System SHALL validate that vehicle ID references an existing vehicle
3. WHEN ticket data is entered, THE Service_Ticket_System SHALL validate that all service codes reference valid Service_Catalog entries
4. WHEN ticket data is entered, THE Service_Ticket_System SHALL validate that mileage is a positive integer
5. WHEN ticket data is entered, THE Service_Ticket_System SHALL validate that quantities are positive integers
6. WHEN ticket data is entered, THE Service_Ticket_System SHALL validate that prices are non-negative numbers with maximum 2 decimal places
7. WHEN ticket data is entered, THE Service_Ticket_System SHALL validate that discount percentages are between 0 and 100
8. WHEN ticket data is entered, THE Service_Ticket_System SHALL validate that discount amounts do not exceed the Subtotal

### Requirement 18: Performance and Responsiveness

**User Story:** As a service advisor, I want fast response times, so that I can serve customers efficiently during busy periods.

#### Acceptance Criteria

1. WHEN a service advisor performs a ticket search, THE Service_Ticket_System SHALL return results within 500 milliseconds for cached data
2. WHEN a service advisor loads a Service_Ticket, THE Service_Ticket_System SHALL render the complete ticket within 1 second
3. WHEN a service advisor adds or removes services, THE Service_Ticket_System SHALL recalculate totals within 100 milliseconds
4. WHEN a service advisor saves ticket data, THE Service_Ticket_System SHALL persist to IndexedDB within 200 milliseconds
5. WHEN the ticket list contains more than 100 results, THE Service_Ticket_System SHALL implement virtual scrolling to maintain performance
6. WHEN the Service_Catalog contains more than 200 items, THE Service_Ticket_System SHALL implement lazy loading or virtualization for the catalog display

### Requirement 19: Data Serialization and Storage

**User Story:** As a system architect, I want consistent data serialization, so that ticket data maintains integrity across storage and transmission.

#### Acceptance Criteria

1. WHEN ticket data is stored to IndexedDB, THE Service_Ticket_System SHALL serialize Service_Ticket objects to JSON format
2. WHEN ticket data is retrieved from IndexedDB, THE Service_Ticket_System SHALL deserialize JSON to Service_Ticket objects
3. WHEN ticket data is transmitted to the backend API, THE Service_Ticket_System SHALL serialize Service_Ticket objects to JSON format
4. WHEN ticket data is received from the backend API, THE Service_Ticket_System SHALL deserialize JSON responses to Service_Ticket objects
5. WHEN date fields are serialized, THE Service_Ticket_System SHALL use ISO 8601 format
6. WHEN currency fields are serialized, THE Service_Ticket_System SHALL preserve precision to exactly 2 decimal places

### Requirement 20: User Interface and Accessibility

**User Story:** As a service advisor, I want an intuitive interface matching the enterprise POS styling, so that I can work efficiently with consistent user experience.

#### Acceptance Criteria

1. WHEN the ticket management interface loads, THE Service_Ticket_System SHALL display a layout consistent with the Valvoline enterprise POS design system
2. WHEN a service advisor interacts with form elements, THE Service_Ticket_System SHALL provide immediate visual feedback through focus states and hover effects
3. WHEN a service advisor uses the interface on a touch device, THE Service_Ticket_System SHALL provide touch-friendly buttons with minimum 44x44 pixel touch targets
4. WHEN a service advisor completes an action, THE Service_Ticket_System SHALL display a success confirmation message for 3 seconds
5. WHEN an error occurs, THE Service_Ticket_System SHALL display a clear error message with actionable guidance
6. WHEN a service advisor uses keyboard navigation, THE Service_Ticket_System SHALL support tab navigation and common keyboard shortcuts
7. WHEN the interface displays currency values, THE Service_Ticket_System SHALL align decimal points for easy scanning
8. WHEN the interface displays the service catalog, THE Service_Ticket_System SHALL use clear visual hierarchy with category headers and service grouping
