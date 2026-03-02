#!/bin/bash

# Offline PIN Authentication Test Script
# This script builds and serves the production version for offline testing

echo "🔧 Building production version with Service Worker..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors and try again."
    exit 1
fi

echo ""
echo "✅ Build complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Start the backend server in another terminal:"
echo "   cd vehicle-pos-pwa"
echo "   node mock-backend/server.js"
echo ""
echo "2. Start the production server (this terminal):"
echo "   cd dist/vehicle-pos-pwa"
echo "   npx http-server -p 8080 -c-1"
echo ""
echo "3. Open browser to http://localhost:8080"
echo ""
echo "4. Login with: EMP001 / SecurePass123!"
echo ""
echo "5. Set up your PIN (e.g., 1234)"
echo ""
echo "6. Logout"
echo ""
echo "7. Stop the backend server (Ctrl+C)"
echo ""
echo "8. Try logging in with your PIN - it should work offline!"
echo ""
echo "Press Enter to start the production server..."
read

cd dist/vehicle-pos-pwa
npx http-server -p 8080 -c-1
