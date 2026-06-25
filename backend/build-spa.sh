#!/bin/bash
# Build the React SPA and copy into Laravel's public directory
# Run this during Laravel Cloud build phase

set -e

echo "==> Building React SPA..."
cd ../svhs-web
npm ci
npm run build

echo "==> Copying SPA build to Laravel public directory..."
cp -r dist/* ../svhs-api/public/

echo "==> SPA build complete!"
