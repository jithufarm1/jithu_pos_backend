#!/bin/bash

# Vehicle POS PWA - Production Deployment Script
# This script helps deploy the application to various hosting platforms

set -e  # Exit on error

echo "🚀 Vehicle POS PWA - Production Deployment"
echo "=========================================="
echo ""

# Check if dist folder exists
if [ ! -d "dist/vehicle-pos-pwa" ]; then
    echo "❌ Production build not found. Building now..."
    npm run build:prod
    echo "✅ Build complete"
    echo ""
fi

# Show deployment options
echo "Select deployment platform:"
echo "1) Netlify (Recommended)"
echo "2) Vercel"
echo "3) Firebase"
echo "4) AWS S3"
echo "5) Local Test Server"
echo "6) Exit"
echo ""

read -p "Enter choice [1-6]: " choice

case $choice in
    1)
        echo ""
        echo "📦 Deploying to Netlify..."
        echo ""
        
        # Check if netlify-cli is installed
        if ! command -v netlify &> /dev/null; then
            echo "Installing Netlify CLI..."
            npm install -g netlify-cli
        fi
        
        echo "Logging in to Netlify..."
        netlify login
        
        echo "Deploying..."
        netlify deploy --prod --dir=dist/vehicle-pos-pwa
        
        echo ""
        echo "✅ Deployment complete!"
        ;;
        
    2)
        echo ""
        echo "📦 Deploying to Vercel..."
        echo ""
        
        # Check if vercel is installed
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm install -g vercel
        fi
        
        echo "Deploying..."
        vercel --prod
        
        echo ""
        echo "✅ Deployment complete!"
        ;;
        
    3)
        echo ""
        echo "📦 Deploying to Firebase..."
        echo ""
        
        # Check if firebase is installed
        if ! command -v firebase &> /dev/null; then
            echo "Installing Firebase CLI..."
            npm install -g firebase-tools
        fi
        
        echo "Logging in to Firebase..."
        firebase login
        
        echo "Deploying..."
        firebase deploy --only hosting
        
        echo ""
        echo "✅ Deployment complete!"
        ;;
        
    4)
        echo ""
        echo "📦 Deploying to AWS S3..."
        echo ""
        
        read -p "Enter S3 bucket name: " bucket_name
        
        if [ -z "$bucket_name" ]; then
            echo "❌ Bucket name is required"
            exit 1
        fi
        
        echo "Uploading files to S3..."
        
        # Upload all files except index.html and service worker
        aws s3 sync dist/vehicle-pos-pwa s3://$bucket_name \
            --acl public-read \
            --cache-control "public, max-age=31536000, immutable" \
            --exclude "index.html" \
            --exclude "ngsw-worker.js"
        
        # Upload index.html and service worker with no-cache
        aws s3 cp dist/vehicle-pos-pwa/index.html s3://$bucket_name/ \
            --acl public-read \
            --cache-control "no-cache"
        
        aws s3 cp dist/vehicle-pos-pwa/ngsw-worker.js s3://$bucket_name/ \
            --acl public-read \
            --cache-control "no-cache"
        
        echo ""
        echo "✅ Deployment complete!"
        echo "📝 Don't forget to configure CloudFront for HTTPS"
        ;;
        
    5)
        echo ""
        echo "🖥️  Starting local test server..."
        echo ""
        
        # Check if http-server is installed
        if ! command -v http-server &> /dev/null; then
            echo "Installing http-server..."
            npm install -g http-server
        fi
        
        echo "Starting server on http://localhost:8080"
        echo "Press Ctrl+C to stop"
        echo ""
        
        http-server dist/vehicle-pos-pwa -p 8080 -c-1
        ;;
        
    6)
        echo "Exiting..."
        exit 0
        ;;
        
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Done!"
echo ""
echo "📚 Documentation:"
echo "  - PRODUCTION-PACKAGE.md - Complete deployment guide"
echo "  - PRODUCTION-DEPLOYMENT.md - Deployment summary"
echo "  - CLIENT-DEMO-GUIDE.md - Demo script"
echo ""
