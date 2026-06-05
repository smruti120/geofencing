#!/bin/bash
echo "🚀 Deploying Production Build to 10.10.220.53..."

# Build the project
echo "📦 Building project..."
npm run build

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist folder not found!"
    exit 1
fi

# Deploy to server
echo "📤 Uploading to server..."
rsync -avz --delete dist/ sharda@10.10.220.53:/var/www/attendance/

# SSH into server to fix permissions
echo "🔧 Fixing permissions on server..."
ssh sharda@10.10.220.53 << 'EOF'
    sudo chown -R www-data:www-data /var/www/attendance
    sudo chmod -R 755 /var/www/attendance
    sudo systemctl restart nginx
    echo "✅ Server updated!"
EOF

echo ""
echo "✅ Production deployment complete!"
echo "🌐 Access your app at: http://10.10.220.53"
echo ""
echo "📋 Quick Setup Guide:"
echo "1. Login as Admin (username: admin, password: admin123)"
echo "2. Go to Admin Portal → Employees Roster"
echo "3. Click 'Create User' or 'Bulk Import' to add users"
echo "4. Configure Geofences and System Settings"
