#!/bin/bash

# Kuppi Deployment Script
set -e

echo "🚀 Starting Kuppi deployment..."

# Navigate to project directory
cd /var/www/kuppi

# Pull latest changes (if using git)
# git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false --legacy-peer-deps

# Build the application
echo "🔨 Building application..."
npm run build

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads logs

# Set permissions
chmod -R 755 uploads

# Copy environment file
if [ -f .env.production ]; then
  cp .env.production .env.local
  echo "✅ Environment file copied"
else
  echo "⚠️  Warning: .env.production not found"
fi

# Restart PM2 process
echo "🔄 Restarting application..."
pm2 delete kuppi 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "✅ Deployment complete!"
echo "📊 Check status with: pm2 status"
echo "📝 View logs with: pm2 logs kuppi"
