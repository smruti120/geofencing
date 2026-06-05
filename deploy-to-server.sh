#!/bin/bash
# Production Deployment Script for Ubuntu Server
# Server: 10.10.220.53
# Path: /var/www/attendance

echo "🚀 Starting Production Deployment..."
echo "===================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build
echo -e "${YELLOW}Step 1: Building project...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"

# Step 2: Verify dist folder
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ dist folder not found!${NC}"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    echo -e "${RED}❌ index.html not found in dist!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ dist folder verified${NC}"
echo "   - index.html: $(stat -c%s dist/index.html) bytes"

# Step 3: Deploy to server
echo -e "${YELLOW}Step 2: Deploying to server...${NC}"
rsync -avz --delete dist/ sharda@10.10.220.53:/var/www/attendance/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo "   Check SSH connection and permissions"
    exit 1
fi
echo -e "${GREEN}✅ Files deployed${NC}"

# Step 4: Fix server permissions and restart nginx
echo -e "${YELLOW}Step 3: Configuring server...${NC}"
ssh sharda@10.10.220.53 << 'REMOTECOMMANDS'
    echo "   Fixing permissions..."
    sudo chown -R www-data:www-data /var/www/attendance
    sudo chmod -R 755 /var/www/attendance
    
    echo "   Checking nginx config..."
    sudo nginx -t
    
    echo "   Restarting nginx..."
    sudo systemctl restart nginx
    
    echo "   Verifying files..."
    ls -la /var/www/attendance/
REMOTECOMMANDS

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Server configuration failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Server configured${NC}"

# Step 5: Summary
echo ""
echo "===================================="
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "🔗 Access your app:"
echo "   http://10.10.220.53"
echo ""
echo "👤 Default login:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📋 Next steps:"
echo "   1. Login as admin"
echo "   2. Go to Admin Portal → Employees"
echo "   3. Bulk import your users"
echo ""
