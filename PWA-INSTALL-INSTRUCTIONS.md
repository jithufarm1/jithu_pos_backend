# PWA Installation Instructions

## Why Can't I Install from Development Server?

The development server (http://localhost:4200/) **does NOT support PWA installation** because:

1. ❌ **No Service Worker** - Service Worker is disabled in development mode
2. ❌ **HTTP Protocol** - Most browsers require HTTPS for PWA installation
3. ❌ **Development Build** - Not optimized for production use

## ✅ How to Install the PWA

### Option 1: Use Production Server (Recommended)

The production build at **http://localhost:8080/** has PWA features enabled.

#### Step 1: Access Production Build
```
http://localhost:8080/
```

#### Step 2: Install the PWA

**Chrome/Edge (Desktop):**
1. Look for the install icon (⊕) in the address bar
2. Click the icon
3. Click "Install" in the popup
4. The app will open in its own window

**Chrome (Android):**
1. Tap the menu (⋮) in the top right
2. Tap "Install app" or "Add to Home screen"
3. Confirm installation
4. App icon appears on home screen

**Safari (iOS):**
1. Tap the Share button (□↑)
2. Scroll down and tap "Add to Home Screen"
3. Name the app and tap "Add"
4. App icon appears on home screen

**Firefox (Desktop):**
1. Click the menu (☰)
2. Click "Install Vehicle POS"
3. Confirm installation

### Option 2: Deploy to HTTPS Server

For full PWA functionality, deploy to a server with HTTPS:

#### Using Netlify (Free)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd vehicle-pos-pwa
netlify deploy --prod --dir=dist/vehicle-pos-pwa
```

#### Using Vercel (Free)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd vehicle-pos-pwa
vercel --prod
```

#### Using GitHub Pages (Free)
```bash
# Build with correct base href
ng build --configuration production --base-href /vehicle-pos-pwa/

# Deploy to gh-pages branch
npx angular-cli-ghpages --dir=dist/vehicle-pos-pwa
```

### Option 3: Use ngrok for HTTPS Tunnel

Create an HTTPS tunnel to your local server:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start production server
cd vehicle-pos-pwa
http-server dist/vehicle-pos-pwa -p 8080 -c-1

# In another terminal, create HTTPS tunnel
ngrok http 8080
```

Then access the HTTPS URL provided by ngrok (e.g., https://abc123.ngrok.io)

## 🔍 Checking PWA Installation Status

### Chrome DevTools
1. Open http://localhost:8080/
2. Press F12 to open DevTools
3. Go to "Application" tab
4. Check "Manifest" section:
   - ✅ Name: "Vehicle POS - Static Data Lookup"
   - ✅ Short name: "Vehicle POS"
   - ✅ Start URL: "./"
   - ✅ Display: "standalone"
   - ✅ Icons: 8 icons listed
5. Check "Service Workers" section:
   - ✅ Status: "activated and is running"
   - ✅ Source: "ngsw-worker.js"

### Lighthouse Audit
1. Open http://localhost:8080/
2. Press F12 → "Lighthouse" tab
3. Select "Progressive Web App"
4. Click "Generate report"
5. Check PWA score (should be 90+)

## 🎯 PWA Installation Checklist

For a PWA to be installable, it must meet these criteria:

- [x] **Served over HTTPS** (or localhost for testing)
- [x] **Has a web app manifest** (manifest.webmanifest)
- [x] **Has a service worker** (ngsw-worker.js)
- [x] **Has icons** (192x192 and 512x512 minimum)
- [x] **Has a name** in manifest
- [x] **Has a start_url** in manifest
- [x] **Has display mode** (standalone, fullscreen, or minimal-ui)
- [x] **Service worker registered** and activated

## 📱 Testing PWA Features

### 1. Offline Mode
```bash
# Install the PWA from http://localhost:8080/
# Login with EMP001 / SecurePass123!
# Search for a vehicle (caches data)
# Stop the backend server:
lsof -ti:3000 | xargs kill

# Refresh the page
# ✅ App still works!
# ✅ Cached vehicle data available
# ✅ "Offline Mode" indicator shows
```

### 2. Add to Home Screen
- Install PWA on mobile device
- App icon appears on home screen
- Opens in standalone mode (no browser UI)
- Splash screen shows on launch

### 3. Background Sync
- Make changes while offline
- Changes queued in IndexedDB
- When online, changes sync automatically

### 4. Push Notifications (Future)
- Service worker can receive push notifications
- Show notifications even when app is closed

## 🚀 Production Deployment Checklist

Before deploying to production:

### 1. Update Environment Configuration
```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiBaseUrl: 'https://your-api-domain.com/api',
  storeId: 'STORE-001'
};
```

### 2. Generate Real Icons
Use a tool to generate proper PNG icons:
- https://realfavicongenerator.net/
- Upload a 512x512 source image
- Download generated icons
- Replace files in `src/assets/icons/`

### 3. Update Manifest
```json
{
  "name": "Your Company - Vehicle POS",
  "short_name": "Vehicle POS",
  "start_url": "https://your-domain.com/",
  "scope": "https://your-domain.com/"
}
```

### 4. Configure Service Worker
Update `ngsw-config.json` with your API URLs:
```json
{
  "dataGroups": [
    {
      "name": "api-vehicles",
      "urls": [
        "https://your-api-domain.com/api/vehicles",
        "https://your-api-domain.com/api/vehicles/*"
      ]
    }
  ]
}
```

### 5. Build for Production
```bash
npm run build:prod
```

### 6. Test Production Build Locally
```bash
http-server dist/vehicle-pos-pwa -p 8080 -c-1
```

### 7. Deploy
Choose your deployment platform:
- Netlify
- Vercel
- AWS S3 + CloudFront
- Azure Static Web Apps
- Google Cloud Storage
- Your own server with HTTPS

## 🔧 Troubleshooting

### Issue: Install button not showing

**Possible causes:**
1. Using development server (http://localhost:4200/)
   - **Solution**: Use production server (http://localhost:8080/)

2. Service Worker not registered
   - **Solution**: Check DevTools → Application → Service Workers

3. Manifest errors
   - **Solution**: Check DevTools → Application → Manifest

4. Missing icons
   - **Solution**: Verify icons exist in `dist/vehicle-pos-pwa/assets/icons/`

5. Already installed
   - **Solution**: Uninstall first, then reinstall

### Issue: Service Worker not activating

**Solution:**
```bash
# Clear service worker cache
# In DevTools → Application → Service Workers
# Click "Unregister"
# Refresh page
```

### Issue: Offline mode not working

**Solution:**
1. Check Service Worker is active
2. Check Network tab shows "(from ServiceWorker)"
3. Check IndexedDB has cached data
4. Verify ngsw-config.json is correct

### Issue: Icons not showing

**Solution:**
1. Verify icons exist: `ls -la src/assets/icons/`
2. Check manifest.webmanifest paths
3. Rebuild: `npm run build:prod`
4. Clear browser cache

## 📊 PWA Metrics

### Lighthouse PWA Score
Target: 90+ / 100

**Key metrics:**
- Fast and reliable (Service Worker)
- Installable (Manifest + Icons)
- PWA optimized (Splash screen, theme color)

### Performance Metrics
- First Contentful Paint: < 1.8s
- Time to Interactive: < 3.8s
- Speed Index: < 3.4s
- Total Blocking Time: < 300ms
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1

## 📚 Additional Resources

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Workbox (Service Worker Library)](https://developers.google.com/web/tools/workbox)

## ✅ Quick Start

**To install and test the PWA right now:**

1. Make sure production server is running:
   ```bash
   cd vehicle-pos-pwa
   http-server dist/vehicle-pos-pwa -p 8080 -c-1
   ```

2. Open in Chrome: http://localhost:8080/

3. Look for install icon (⊕) in address bar

4. Click "Install"

5. App opens in standalone window!

6. Login with: `EMP001` / `SecurePass123!`

7. Test offline mode:
   - Search for a vehicle
   - Stop backend server
   - Refresh page
   - Still works!

---

**Need Help?**
- Check [SERVERS-STATUS.md](./SERVERS-STATUS.md) for server status
- Check [ENTERPRISE-SECURITY-GUIDE.md](./ENTERPRISE-SECURITY-GUIDE.md) for security features
- Check browser console (F12) for errors
