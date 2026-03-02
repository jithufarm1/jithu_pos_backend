/**
 * Generate PWA Icons
 * Creates placeholder icons for PWA installation
 */

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'src', 'assets', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes required for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create SVG icons (scalable)
sizes.forEach(size => {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1976d2"/>
  <path d="M${size * 0.2} ${size * 0.3}L${size * 0.3} ${size * 0.5}L${size * 0.2} ${size * 0.7}L${size * 0.8} ${size * 0.7}L${size * 0.7} ${size * 0.5}L${size * 0.8} ${size * 0.3}Z" fill="white"/>
  <circle cx="${size * 0.3}" cy="${size * 0.65}" r="${size * 0.05}" fill="white"/>
  <circle cx="${size * 0.7}" cy="${size * 0.65}" r="${size * 0.05}" fill="white"/>
</svg>`;
  
  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(iconsDir, filename);
  
  // For now, save as SVG (browsers will handle it)
  // In production, you'd use a library like sharp to convert to PNG
  fs.writeFileSync(filepath.replace('.png', '.svg'), svg);
  
  console.log(`Created ${filename}`);
});

console.log('\n✅ PWA icons generated successfully!');
console.log('📁 Location: src/assets/icons/');
console.log('\n⚠️  Note: These are SVG placeholders.');
console.log('For production, convert to PNG using a tool like:');
console.log('  - https://realfavicongenerator.net/');
console.log('  - npm package: sharp or jimp');
