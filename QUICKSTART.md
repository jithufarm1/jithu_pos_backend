# Quick Start Guide - Vehicle POS PWA

Get up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm installed

## Step 1: Install Dependencies

```bash
cd vehicle-pos-pwa
npm install
```

## Step 2: Install Angular CLI

```bash
npm install -g @angular/cli@17
```

## Step 3: Start Development Server

```bash
npm start
```

The application will open at `http://localhost:4200/`

## Step 4: Test the Application

### Search by Criteria
1. Select a Year (e.g., 2023)
2. Select a Make (e.g., Toyota)
3. Select a Model (e.g., Camry)
4. Click "Search"

### Search by VIN
1. Enter a VIN: `1HGBH41JXMN109186`
2. Click "Search" or press Enter

## Step 5: Test Offline Mode

1. Open Chrome DevTools (F12)
2. Go to "Network" tab
3. Select "Offline" from throttling dropdown
4. Try searching again - cached data will be used!

## What's Next?

### Configure API Endpoint

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  apiBaseUrl: 'YOUR_API_URL_HERE',  // Change this
  // ... rest of config
};
```

### Build for Production

```bash
npm run build:prod
```

Output will be in `dist/vehicle-pos-pwa/`

### Test PWA Features

```bash
# Install http-server
npm install -g http-server

# Serve production build
cd dist/vehicle-pos-pwa
http-server -p 8080 -c-1
```

Visit `http://localhost:8080/` and install the PWA!

## Troubleshooting

### Port Already in Use

```bash
ng serve --port 4201
```

### Module Not Found

```bash
rm -rf node_modules package-lock.json
npm install
```

### Service Worker Issues

Service Worker only works in production builds. Use:

```bash
ng build --configuration production
```

## Need Help?

Check the full [README.md](README.md) for detailed documentation.

## Mock Data

The application includes mock data in `mock-data/` directory:
- `reference-data.json`: Makes, models, engines
- `vehicles.json`: Sample vehicle data

You can use these to set up a mock backend with `json-server`:

```bash
npm install -g json-server
json-server --watch mock-data/vehicles.json --port 3000
```

---

**Happy Coding! 🚗💨**
