# PWA Icons

This directory should contain PWA icons in the following sizes:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## Generating Icons

You can use online tools to generate PWA icons from a single source image:

1. **PWA Asset Generator**: https://www.pwabuilder.com/imageGenerator
2. **RealFaviconGenerator**: https://realfavicongenerator.net/
3. **Favicon.io**: https://favicon.io/

## Icon Requirements

- Format: PNG
- Background: Solid color (#1976d2 recommended)
- Content: Simple, recognizable logo or icon
- Purpose: "maskable any" (supports both maskable and standard icons)

## Quick Setup

For development, you can create simple colored squares as placeholders:

```bash
# Using ImageMagick (if installed)
convert -size 72x72 xc:#1976d2 icon-72x72.png
convert -size 96x96 xc:#1976d2 icon-96x96.png
convert -size 128x128 xc:#1976d2 icon-128x128.png
convert -size 144x144 xc:#1976d2 icon-144x144.png
convert -size 152x152 xc:#1976d2 icon-152x152.png
convert -size 192x192 xc:#1976d2 icon-192x192.png
convert -size 384x384 xc:#1976d2 icon-384x384.png
convert -size 512x512 xc:#1976d2 icon-512x512.png
```

Or use any image editor to create simple icons with the app logo or initials "VP" (Vehicle POS).
