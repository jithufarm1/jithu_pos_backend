# Vehicle POS PWA - Static Data Lookup

A Progressive Web App (PWA) for vehicle static data lookup in an automotive service retail system. This POC demonstrates a Cloud-First POS modernization initiative with offline-first capabilities, enterprise architecture patterns, and resilient network handling.

## 🎯 Overview

This application provides service advisors with quick access to vehicle specifications and service requirements through:
- Vehicle search by Year, Make, and Model
- VIN-based vehicle lookup
- Offline data access with IndexedDB caching
- Automatic request retry when connection is restored
- Enterprise POS-style UI/UX

## ✨ Features

### Core Functionality
- **Vehicle Search**: Search by criteria (Year/Make/Model) or VIN
- **Offline Mode**: Access cached data when network is unavailable
- **Request Queue**: Failed requests automatically retry when online
- **PWA Installation**: Install as standalone desktop application
- **Network Status**: Real-time online/offline indicator

### Technical Features
- Angular 17+ with standalone components
- TypeScript strict mode
- IndexedDB for local storage (100 vehicle cache, reference data)
- Angular Service Worker for PWA functionality
- RxJS for reactive data flow
- Repository pattern for data access
- Network-first caching strategy

## 📋 Prerequisites

- Node.js 18+ and npm
- Angular CLI 17+
- Modern browser with PWA support (Chrome 90+, Edge 90+, Firefox 88+, Safari 14+)

## 🚀 Installation

### 1. Install Dependencies

```bash
cd vehicle-pos-pwa
npm install
```

### 2. Install Angular CLI (if not already installed)

```bash
npm install -g @angular/cli@17
```

## 🏃 Running the Application

### Development Server

```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any source files.

### Production Build

```bash
npm run build:prod
# or
ng build --configuration production
```

The build artifacts will be stored in the `dist/` directory.

### Serve Production Build Locally

```bash
# Install http-server globally
npm install -g http-server

# Serve the production build
cd dist/vehicle-pos-pwa
http-server -p 8080 -c-1
```

Navigate to `http://localhost:8080/`

## 🧪 Testing

### Run Unit Tests

```bash
npm test
# or
ng test
```

### Run Tests with Coverage

```bash
ng test --code-coverage
```

Coverage reports will be generated in the `coverage/` directory.

## 🔧 Configuration

### Environment Variables

Edit `src/environments/environment.ts` for development:

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',  // Your API endpoint
  storeId: 'STORE-001',                      // Store identifier
  cacheMaxAge: 86400000,                     // 24 hours
  maxCachedVehicles: 100,
  maxQueuedRequests: 100,
};
```

Edit `src/environments/environment.prod.ts` for production:

```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.example.com/api',  // Production API
  storeId: 'STORE-001',
  cacheMaxAge: 86400000,
  maxCachedVehicles: 100,
  maxQueuedRequests: 100,
};
```

### API Endpoints

The application expects the following REST API endpoints:

1. **Vehicle Search**
   ```
   GET /api/vehicles?year={year}&make={make}&model={model}
   ```

2. **VIN Lookup**
   ```
   GET /api/vehicles/{vin}
   ```

3. **Reference Data**
   ```
   GET /api/vehicles/reference-data
   ```

See `mock-data/` directory for sample API responses.

## 🧪 Testing Offline Mode

### Method 1: Chrome DevTools

1. Open Chrome DevTools (F12)
2. Go to "Network" tab
3. Select "Offline" from the throttling dropdown
4. Try searching for vehicles - cached data will be used

### Method 2: Service Worker

1. Build and serve production version
2. Open Application tab in DevTools
3. Go to Service Workers section
4. Check "Offline" checkbox
5. Test vehicle search functionality

### Method 3: Disconnect Network

1. Disconnect from WiFi/Ethernet
2. Application will show "Offline" status
3. Search for previously cached vehicles
4. Reconnect to see queued requests retry

## 🔍 Testing Network Failure Simulation

### Simulate API Failures

1. **Using DevTools**:
   - Network tab → Right-click request → Block request URL
   - Requests will be queued for retry

2. **Using Mock Server**:
   - Configure mock server to return 500 errors
   - Watch requests queue and retry automatically

3. **Using Request Blocking**:
   - DevTools → Network → Request blocking
   - Add pattern: `*/api/vehicles/*`
   - Enable request blocking

## 📱 PWA Installation

### Desktop Installation

1. **Chrome/Edge**:
   - Click install icon in address bar
   - Or: Menu → Install Vehicle POS

2. **Firefox**:
   - Click install icon in address bar

3. **Safari**:
   - Share → Add to Dock

### Verify Installation

1. Check Application tab in DevTools
2. Verify Service Worker is registered
3. Check manifest.webmanifest is loaded
4. Verify icons are cached

## 🗄️ IndexedDB Inspection

### Chrome DevTools

1. Open DevTools (F12)
2. Go to "Application" tab
3. Expand "IndexedDB" in left sidebar
4. Select "vehicle-pos-db"
5. Inspect object stores:
   - `reference-data`: Cached makes/models/engines
   - `vehicle-cache`: Last 100 vehicle lookups
   - `request-queue`: Failed requests pending retry

### View Cached Data

```javascript
// Open browser console and run:

// Get all cached vehicles
const db = await indexedDB.open('vehicle-pos-db', 1);
const tx = db.transaction('vehicle-cache', 'readonly');
const store = tx.objectStore('vehicle-cache');
const vehicles = await store.getAll();
console.log('Cached vehicles:', vehicles);
```

## 📁 Project Structure

```
vehicle-pos-pwa/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── models/              # Data models and interfaces
│   │   │   ├── repositories/        # IndexedDB data access layer
│   │   │   └── services/            # Core services (network, error, retry)
│   │   ├── features/
│   │   │   └── vehicle/
│   │   │       ├── components/      # Vehicle search and details
│   │   │       └── services/        # Vehicle service (API calls)
│   │   ├── shared/
│   │   │   └── components/          # Header, network status
│   │   └── app.component.*          # Root component
│   ├── assets/                      # Static assets and icons
│   ├── environments/                # Environment configurations
│   ├── index.html                   # Main HTML file
│   ├── main.ts                      # Application bootstrap
│   ├── manifest.webmanifest         # PWA manifest
│   └── styles.css                   # Global styles
├── mock-data/                       # Sample API responses
├── ngsw-config.json                 # Service Worker configuration
├── angular.json                     # Angular CLI configuration
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript configuration
└── README.md                        # This file
```

## 🏗️ Architecture

### Layered Architecture

```
┌─────────────────────────────────────┐
│     Presentation Layer              │
│  (Components, Templates, Styles)    │
├─────────────────────────────────────┤
│     Service Layer                   │
│  (Business Logic, API Calls)        │
├─────────────────────────────────────┤
│     Data Access Layer               │
│  (Repositories, IndexedDB)          │
├─────────────────────────────────────┤
│     Storage & Caching               │
│  (IndexedDB, Service Worker)        │
└─────────────────────────────────────┘
```

### Key Design Patterns

- **Repository Pattern**: Abstracts IndexedDB operations
- **Service Layer**: Centralizes business logic and API calls
- **Observer Pattern**: RxJS observables for reactive data flow
- **Retry Pattern**: Exponential backoff for failed requests
- **Cache-Aside Pattern**: Network-first with cache fallback

### Caching Strategy

- **Static Assets**: Cache-first (Service Worker)
- **API Calls**: Network-first with cache fallback
- **Reference Data**: Cache-first with 24-hour TTL
- **Vehicle Lookups**: Network-first, cache for offline access

## 🔐 Security Considerations

- HTTPS required for PWA installation
- Input validation (VIN format, dropdown selections)
- No sensitive data stored in IndexedDB
- CORS configured on backend
- XSS protection via Angular sanitization

## 🎨 UI/UX Design

### Color Scheme
- Primary: #1976d2 (Blue)
- Accent: #ff9800 (Orange)
- Success: #4caf50 (Green)
- Error: #f44336 (Red)
- Background: #f5f5f5 (Light Gray)

### Typography
- Font: Roboto
- Headers: 20-24px, 500 weight
- Body: 14px, 400 weight
- Labels: 12px, 500 weight

## 📊 Performance

### Metrics
- Initial Load: < 3 seconds (3G)
- Subsequent Loads: < 1 second (cached)
- Offline Search: < 500ms (IndexedDB)
- API Response: Loading state after 200ms

### Optimization
- Tree shaking enabled
- AOT compilation
- Lazy loading (future enhancement)
- Service Worker caching
- IndexedDB for large datasets

## 🐛 Troubleshooting

### Service Worker Not Registering

```bash
# Ensure production build
ng build --configuration production

# Serve with HTTPS (required for SW)
# Use http-server with SSL or deploy to HTTPS host
```

### IndexedDB Errors

```javascript
// Clear IndexedDB in browser console
indexedDB.deleteDatabase('vehicle-pos-db');
// Refresh page
```

### API Connection Issues

1. Check `environment.ts` has correct API URL
2. Verify CORS is configured on backend
3. Check browser console for network errors
4. Verify API endpoints match expected format

### PWA Not Installing

1. Ensure HTTPS (localhost is exempt)
2. Verify manifest.webmanifest is accessible
3. Check Service Worker is registered
4. Verify icons are present in assets/icons/

## 📝 Mock Backend Setup

For development without a real backend, you can use the mock data:

### Option 1: JSON Server

```bash
# Install json-server
npm install -g json-server

# Create db.json from mock data
# Then run:
json-server --watch db.json --port 3000
```

### Option 2: Angular In-Memory Web API

```bash
npm install angular-in-memory-web-api --save-dev
```

Then configure in `app.config.ts` (see Angular docs).

## 🚀 Deployment

### Build for Production

```bash
npm run build:prod
```

### Deploy to Hosting

The `dist/vehicle-pos-pwa` folder can be deployed to:
- **Firebase Hosting**
- **Netlify**
- **Vercel**
- **AWS S3 + CloudFront**
- **Azure Static Web Apps**
- **GitHub Pages**

### HTTPS Requirement

PWA features require HTTPS. Ensure your hosting provides SSL certificates.

## 📚 Additional Resources

- [Angular Documentation](https://angular.io/docs)
- [Angular Service Worker](https://angular.io/guide/service-worker-intro)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [RxJS Documentation](https://rxjs.dev/)

## 🤝 Contributing

This is a POC project. For production use:
1. Add comprehensive unit tests
2. Implement E2E tests
3. Add authentication/authorization
4. Implement proper error tracking
5. Add analytics
6. Enhance accessibility (WCAG 2.1 AA)

## 📄 License

This project is a proof of concept for enterprise use.

## 👥 Support

For issues or questions:
1. Check browser console for errors
2. Inspect IndexedDB for cached data
3. Verify Service Worker registration
4. Check network tab for API calls

---

**Built with Angular 17+ | TypeScript | IndexedDB | Service Workers**

*Enterprise-grade Progressive Web App for Automotive Service Retail*
