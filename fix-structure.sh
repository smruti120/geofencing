#!/bin/bash
echo "🔧 Fixing Directory Structure..."

cd /var/www/attendance

# Backup current setup
echo "📦 Backing up..."
sudo mkdir -p backup
cp -r dist backup/ 2>/dev/null || true
cp index.html backup/ 2>/dev/null || true

# Check if dist folder exists with built files
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo "✅ Found dist folder with built files"
    
    # Remove old source files (keep only production build)
    echo "🧹 Cleaning up source files..."
    sudo rm -rf src node_modules package.json package-lock.json tsconfig.json vite.config.ts server.js
    
    # Move dist contents to root
    echo "📁 Moving dist files to root..."
    sudo mv dist/* . 2>/dev/null || true
    sudo mv dist/assets . 2>/dev/null || true
    sudo rmdir dist 2>/dev/null || true
    
    echo "✅ Files moved to /var/www/attendance/"
else
    echo "❌ No dist folder found!"
    echo "You need to run 'npm run build' first or copy the built dist folder"
fi

# List final structure
echo ""
echo "📂 Final directory structure:"
ls -la

# Check if index.html exists
if [ -f "index.html" ]; then
    echo ""
    echo "✅ index.html found! Size: $(stat -c%s index.html) bytes"
else
    echo "❌ index.html NOT found!"
fi

# Fix permissions
sudo chown -R www-data:www-data /var/www/attendance
sudo chmod -R 755 /var/www/attendance

# Restart nginx
echo ""
echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx

echo ""
echo "✅ Done! Check http://10.10.220.53"
