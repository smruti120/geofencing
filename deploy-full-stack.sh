#!/bin/bash
# Full Stack Deployment Script for OmniGuard
# Includes Backend + Frontend + Database

SERVER_IP="10.10.220.53"
SERVER_USER="sharda"
REMOTE_PATH="/var/www/attendance"

echo "🚀 OmniGuard Full Stack Deployment"
echo "=================================="
echo "Server: $SERVER_IP"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Build Frontend
echo -e "${YELLOW}[1/5] Building Frontend...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend built${NC}"

# Step 2: Deploy Frontend
echo -e "${YELLOW}[2/5] Deploying Frontend...${NC}"
rsync -avz --delete dist/ $SERVER_USER@$SERVER_IP:$REMOTE_PATH/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend deployment failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend deployed${NC}"

# Step 3: Deploy Backend
echo -e "${YELLOW}[3/5] Deploying Backend...${NC}"
rsync -avz --delete server/ $SERVER_USER@$SERVER_IP:$REMOTE_PATH/server/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend deployment failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend deployed${NC}"

# Step 4: Configure Server (SSH)
echo -e "${YELLOW}[4/5] Configuring Server...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'REMOTECOMMANDS'
    cd /var/www/attendance
    
    # Create .env file if not exists
    if [ ! -f "server/.env" ]; then
        echo "Creating .env file..."
        cat > server/.env << 'EOF'
PORT=3001
JWT_SECRET=omniguard-secret-key-$(date +%s)
CORS_ORIGINS=http://localhost:5173,http://10.10.220.53
NODE_ENV=production
EOF
    fi
    
    # Install backend dependencies
    echo "Installing backend dependencies..."
    cd server
    npm install
    
    # Initialize database
    echo "Initializing database..."
    npm run init-db
    
    # Fix permissions
    echo "Fixing permissions..."
    sudo chown -R www-data:www-data /var/www/attendance
    sudo chmod -R 755 /var/www/attendance
    
    # Setup PM2 for backend
    echo "Setting up PM2..."
    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2
    fi
    
    # Stop existing process
    pm2 stop omniguard-api 2>/dev/null || true
    pm2 delete omniguard-api 2>/dev/null || true
    
    # Start backend with PM2
    pm2 start server.js --name omniguard-api --cwd /var/www/attendance/server
    pm2 save
    sudo pm2 startup systemd -u $USER --hp $HOME
    
    # Configure Nginx
    echo "Configuring Nginx..."
    sudo tee /etc/nginx/sites-available/attendance > /dev/null << 'EOF'
server {
    listen 80 default_server;
    server_name 10.10.220.53 localhost;

    root /var/www/attendance;
    index index.html;

    # API Proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF
    
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo ln -sf /etc/nginx/sites-available/attendance /etc/nginx/sites-enabled/
    
    # Test and reload nginx
    sudo nginx -t && sudo systemctl restart nginx
    
    echo "Server configuration complete!"
REMOTECOMMANDS

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Server configuration failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Server configured${NC}"

# Step 5: Summary
echo ""
echo "=================================="
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "🔗 Access URLs:"
echo "   Frontend: http://$SERVER_IP"
echo "   API:      http://$SERVER_IP/api"
echo ""
echo "📊 Services:"
echo "   - Nginx (Port 80)"
echo "   - Node API (Port 3001 via PM2)"
echo "   - SQLite Database"
echo ""
echo "👤 Default Login:"
echo "   Email: admin@campus.edu"
echo "   Password: admin123"
echo ""
echo "🛠️ Management Commands:"
echo "   View logs:    ssh $SERVER_USER@$SERVER_IP 'pm2 logs omniguard-api'"
echo "   Restart API:  ssh $SERVER_USER@$SERVER_IP 'pm2 restart omniguard-api'"
echo "   View status:  ssh $SERVER_USER@$SERVER_IP 'pm2 status'"
echo ""
