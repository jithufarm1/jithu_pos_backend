# Automatic Update Detection Setup

## What This Does

Automatically detects when a new version of your app is deployed and prompts users to update without manual hard refresh.

## Quick Setup (3 Steps)

### Step 1: Add Version Checker to App Component

Open `src/app/app.component.ts` and add the import:

```typescript
import { VersionCheckerComponent } from './shared/components/version-checker/version-checker.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    AppHeaderComponent,
    VersionCheckerComponent  // ← Add this
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  // ... existing code
}
```

### Step 2: Add Component to Template

Open `src/app/app.component.html` and add at the top:

```html
<!-- Version checker banner -->
<app-version-checker></app-version-checker>

<!-- Existing header -->
<app-header *ngIf="showHeader"></app-header>

<!-- Rest of your template -->
<router-outlet></router-outlet>
```

### Step 3: Done!

That's it! The version checker will:
- ✅ Automatically detect new versions
- ✅ Show a banner at the top of the page
- ✅ Prompt users to update
- ✅ Reload the app with new code

## How It Works

### Development Mode (npm start)
- Service worker is **disabled**
- Version checker is **inactive**
- Changes appear automatically when you save files
- No banner will show

### Production Mode (npm run build)
- Service worker is **enabled**
- Version checker is **active**
- Checks for updates every 5 minutes
- Shows banner when new version detected

## Testing the Auto-Update

### Test in Production Mode

1. **Build and serve version 1**:
   ```bash
   npm run build
   http-server dist/vehicle-pos-pwa -p 8080 -c-1
   ```

2. **Open app** in browser: http://localhost:8080

3. **Make a visible change** (e.g., change a button text)

4. **Build version 2**:
   ```bash
   npm run build
   ```

5. **Wait 5 minutes** (or refresh the page)

6. **Banner appears** at top: "A new version is available!"

7. **Click "Update Now"** - app reloads with new code

## Customization

### Change Update Check Interval

In `version-checker.component.ts`, change the interval:

```typescript
// Check every 5 minutes (default)
setInterval(() => {
  this.swUpdate.checkForUpdate();
}, 5 * 60 * 1000);

// Check every 1 minute (more frequent)
setInterval(() => {
  this.swUpdate.checkForUpdate();
}, 1 * 60 * 1000);

// Check every 30 seconds (very frequent, not recommended)
setInterval(() => {
  this.swUpdate.checkForUpdate();
}, 30 * 1000);
```

### Change Banner Style

Edit the styles in `version-checker.component.ts`:

```typescript
styles: [`
  .update-banner {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); // ← Change colors
    // ... other styles
  }
`]
```

### Auto-Update Without Prompt

If you want to auto-update without asking the user:

```typescript
ngOnInit(): void {
  if (this.swUpdate.isEnabled) {
    this.swUpdate.versionUpdates
      .pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY')
      )
      .subscribe(event => {
        console.log('New version available, auto-updating...');
        this.swUpdate.activateUpdate().then(() => {
          window.location.reload();
        });
      });
  }
}
```

## Troubleshooting

### Banner Never Shows

**Cause**: Service worker not enabled or not in production mode

**Solution**:
1. Make sure you're using production build: `npm run build`
2. Serve with http-server: `http-server dist/vehicle-pos-pwa -p 8080 -c-1`
3. Don't use `npm start` (dev server doesn't support service workers)

### Banner Shows But Update Doesn't Work

**Cause**: Service worker cache issue

**Solution**:
1. Open DevTools (F12)
2. Application tab → Service Workers
3. Click "Unregister"
4. Refresh page
5. Service worker will re-register with new version

### Update Check Too Slow

**Cause**: 5-minute interval is too long

**Solution**: Reduce the interval (see Customization section above)

## Alternative: Manual Version Display

If you don't want automatic updates, you can just display the version number:

### Add to `app.component.ts`:

```typescript
export class AppComponent {
  version = '1.0.0'; // Update manually with each deployment
}
```

### Add to `app.component.html`:

```html
<footer class="app-footer">
  <span>Version {{ version }}</span>
</footer>
```

### Update version with each deployment:

```typescript
version = '1.0.1'; // Increment this
```

Users can see which version they're running and manually refresh if needed.

## Best Practice Recommendation

**For Development**:
- Use `npm start` (port 4200)
- Normal refresh (F5) works fine
- Hard refresh (Cmd+Shift+R) if issues

**For Production**:
- Use `npm run build` + http-server (port 8080)
- Add version checker component
- Users get automatic update prompts
- No manual intervention needed

## Summary

✅ **Automatic**: Version checker detects updates
✅ **User-Friendly**: Banner prompts user to update
✅ **No Hard Refresh**: Users just click "Update Now"
✅ **Production Only**: Doesn't interfere with development
✅ **Easy Setup**: Just 3 steps to implement

This solves the cache busting problem permanently!
