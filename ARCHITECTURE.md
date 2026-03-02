# Architecture Documentation

## System Overview

The Vehicle POS PWA is built using a layered architecture pattern with clear separation of concerns. The application follows enterprise best practices and implements offline-first capabilities for resilient operation in retail environments.

## Architecture Layers

### 1. Presentation Layer
**Location**: `src/app/features/*/components/`, `src/app/shared/components/`

**Responsibilities**:
- User interface rendering
- User input handling
- Display logic
- Component state management

**Key Components**:
- `VehicleSearchComponent`: Search interface
- `VehicleDetailsComponent`: Display vehicle information
- `HeaderComponent`: Application header with branding
- `NetworkStatusComponent`: Real-time network indicator

**Technologies**:
- Angular standalone components
- Template-driven forms
- RxJS observables for reactive updates

### 2. Service Layer
**Location**: `src/app/core/services/`, `src/app/features/*/services/`

**Responsibilities**:
- Business logic
- API communication
- Error handling
- Network detection
- Request retry management

**Key Services**:
- `VehicleService`: Vehicle data operations
- `NetworkDetectionService`: Monitor online/offline state
- `ErrorHandlerService`: Centralized error management
- `RetryQueueService`: Failed request retry logic

**Design Patterns**:
- Singleton pattern (providedIn: 'root')
- Observer pattern (RxJS)
- Strategy pattern (caching strategies)

### 3. Data Access Layer
**Location**: `src/app/core/repositories/`

**Responsibilities**:
- IndexedDB operations
- Data persistence
- Cache management
- LRU eviction

**Key Repositories**:
- `IndexedDBRepository`: Base repository with CRUD operations
- `VehicleCacheRepository`: Vehicle data caching (100 max)
- `ReferenceDataRepository`: Reference data with TTL
- `RequestQueueRepository`: Failed request queue

**Design Patterns**:
- Repository pattern
- Template method pattern (base repository)

### 4. Storage & Caching Layer
**Location**: IndexedDB, Service Worker

**Responsibilities**:
- Persistent storage
- Offline data access
- Static asset caching
- Network request caching

**Components**:
- IndexedDB database: `vehicle-pos-db`
- Angular Service Worker
- HTTP cache

## Data Flow

### Online Search Flow

```
User Input
    ↓
VehicleSearchComponent
    ↓
VehicleService.searchVehicles()
    ↓
HTTP Request → Backend API
    ↓
Response → Cache in IndexedDB
    ↓
Update NetworkService.lastSync
    ↓
Emit to Component
    ↓
Display Results
```

### Offline Search Flow

```
User Input
    ↓
VehicleSearchComponent
    ↓
VehicleService.searchVehicles()
    ↓
HTTP Request → FAILS (offline)
    ↓
Fallback to VehicleCacheRepository
    ↓
Search IndexedDB
    ↓
Return Cached Data
    ↓
Display Results (with cache indicator)
```

### Request Retry Flow

```
API Request Fails
    ↓
ErrorHandlerService.isRecoverable() → true
    ↓
RetryQueueService.enqueue()
    ↓
Store in RequestQueueRepository
    ↓
NetworkDetectionService detects online
    ↓
RetryQueueService.processQueue()
    ↓
Retry with exponential backoff
    ↓
Success → Remove from queue
Failure → Increment retry count
```

## IndexedDB Schema

### Database: `vehicle-pos-db` (version 1)

#### Object Store: `reference-data`
```
Key Path: id
Indexes: none
Purpose: Store makes, models, engines, service types
TTL: 24 hours
```

#### Object Store: `vehicle-cache`
```
Key Path: vin
Indexes: 
  - year (non-unique)
  - make (non-unique)
  - model (non-unique)
  - cachedAt (non-unique)
Purpose: Cache vehicle lookups
Max Entries: 100 (LRU eviction)
```

#### Object Store: `request-queue`
```
Key Path: id
Indexes:
  - timestamp (non-unique)
Purpose: Queue failed API requests
Max Entries: 100
Auto-purge: > 24 hours old
```

## Caching Strategies

### 1. Network-First (Vehicle Searches)
```
Try Network
  ↓ Success → Cache → Return
  ↓ Failure
Try Cache
  ↓ Success → Return (with stale indicator)
  ↓ Failure → Error
```

### 2. Cache-First (Reference Data)
```
Try Cache
  ↓ Hit & Fresh → Return
  ↓ Miss or Stale
Try Network
  ↓ Success → Update Cache → Return
  ↓ Failure → Return Stale Cache (if available)
```

### 3. Cache-Only (Static Assets)
```
Service Worker Cache
  ↓ Hit → Return
  ↓ Miss → Fetch → Cache → Return
```

## Service Worker Configuration

### Asset Groups

**App Shell** (Prefetch):
- index.html
- *.css
- *.js
- favicon.ico

**Assets** (Lazy):
- /assets/**
- Images, fonts

### Data Groups

**API Vehicles** (Freshness):
- Strategy: Network-first
- Max Size: 100 entries
- Max Age: 1 day
- Timeout: 5 seconds

**API Reference** (Performance):
- Strategy: Cache-first
- Max Size: 1 entry
- Max Age: 1 day

## Error Handling Strategy

### Error Categories

1. **Network Errors** (status 0, NetworkError)
   - Message: "Unable to connect. Using cached data."
   - Action: Fallback to cache, queue for retry

2. **Not Found** (status 404)
   - Message: "Vehicle not found. Please check your search criteria."
   - Action: Display error, no retry

3. **Server Errors** (status 500+)
   - Message: "Service temporarily unavailable. Please try again."
   - Action: Queue for retry

4. **Validation Errors** (status 400, 422)
   - Message: Custom validation message
   - Action: Display error, no retry

### Retry Logic

- **Max Retries**: 5 attempts
- **Backoff**: Exponential (1s, 2s, 4s, 8s, 16s)
- **Idempotency**: Request ID prevents duplicates
- **Auto-trigger**: On network reconnection

## State Management

### Component State
- Local state using RxJS BehaviorSubjects
- Reactive updates via observables
- OnPush change detection strategy

### Application State
- Network status (global)
- Reference data (cached)
- Selected vehicle (component)

### Future Enhancement
- Consider NgRx for complex state management
- Implement state persistence

## Security Considerations

### Input Validation
- VIN format: 17 alphanumeric characters
- Dropdown selections: Validated against reference data
- SQL injection: Prevented by API (not client responsibility)

### Data Storage
- No sensitive data in IndexedDB
- No authentication tokens stored locally
- Clear separation of concerns

### Network Security
- HTTPS required for PWA
- CORS configured on backend
- API authentication (backend responsibility)

## Performance Optimizations

### Bundle Size
- Tree shaking enabled
- AOT compilation
- Lazy loading (future)
- Minification and compression

### Runtime Performance
- OnPush change detection
- Virtual scrolling (future)
- Debounced search inputs
- Efficient IndexedDB queries

### Caching
- Service Worker caches static assets
- IndexedDB caches dynamic data
- HTTP cache headers respected
- LRU eviction prevents unbounded growth

## Scalability Considerations

### Current Limits
- 100 cached vehicles (LRU eviction)
- 100 queued requests
- 50MB IndexedDB storage (browser limit)

### Future Enhancements
- Configurable cache sizes
- Selective sync strategies
- Background sync API
- Push notifications

## Testing Strategy

### Unit Tests
- Services: Mock HTTP, IndexedDB
- Repositories: Mock IndexedDB
- Components: Mock services
- Target: 80%+ coverage

### Integration Tests
- Service + Repository integration
- Component + Service integration
- IndexedDB operations

### E2E Tests
- Vehicle search flow
- Offline mode
- PWA installation
- Request retry

## Deployment Architecture

### Development
```
Developer Machine
    ↓
ng serve (webpack dev server)
    ↓
http://localhost:4200
```

### Production
```
Build Process (ng build --prod)
    ↓
Static Files (dist/)
    ↓
CDN / Static Hosting
    ↓
HTTPS Required
    ↓
Service Worker Enabled
```

### Hosting Options
- Firebase Hosting
- Netlify
- Vercel
- AWS S3 + CloudFront
- Azure Static Web Apps

## Monitoring & Observability

### Current Implementation
- Console logging
- Error categorization
- Network status tracking

### Production Recommendations
- Application Insights / Google Analytics
- Error tracking (Sentry, Rollbar)
- Performance monitoring (Lighthouse CI)
- User analytics
- Service Worker lifecycle events

## Future Enhancements

### Phase 2 Features
- Background sync API
- Push notifications
- Advanced search filters
- Vehicle comparison
- Print functionality

### Technical Improvements
- NgRx state management
- GraphQL API integration
- Real-time updates (WebSocket)
- Advanced caching strategies
- Micro-frontend architecture

## Architecture Decision Records

### ADR-001: Angular Standalone Components
**Decision**: Use standalone components instead of NgModules
**Rationale**: Simpler structure, better tree-shaking, modern Angular best practice
**Consequences**: Requires Angular 14+, easier testing, reduced boilerplate

### ADR-002: IndexedDB over LocalStorage
**Decision**: Use IndexedDB for data persistence
**Rationale**: Larger capacity (50MB+ vs 5-10MB), structured data, async operations
**Consequences**: More complex API, better performance for large datasets

### ADR-003: Repository Pattern
**Decision**: Abstract IndexedDB operations behind repository interfaces
**Rationale**: Separation of concerns, easier testing, flexibility to change storage
**Consequences**: Additional abstraction layer, cleaner architecture

### ADR-004: Network-First Caching
**Decision**: Implement network-first strategy for vehicle searches
**Rationale**: Always get fresh data when online, fallback ensures offline functionality
**Consequences**: Slightly slower when online, better UX overall

### ADR-005: Exponential Backoff Retry
**Decision**: Use exponential backoff for request retries
**Rationale**: Prevents server overload, increases success probability
**Consequences**: Longer wait times for persistent failures, better resilience

## Conclusion

This architecture provides a solid foundation for an enterprise-grade PWA with offline-first capabilities. The layered approach ensures maintainability, testability, and scalability while following Angular and TypeScript best practices.
