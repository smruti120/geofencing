# 🗄️ OmniGuard Database Setup Guide

## Overview

OmniGuard now uses **SQLite** database with a **Node.js/Express** backend API. This provides:

- ✅ Persistent data storage
- ✅ REST API for all operations
- ✅ JWT authentication
- ✅ CRUD operations for all entities

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   React     │──────▶│  Express API │──────▶│   SQLite    │
│  Frontend   │      │   (Node.js)  │      │  Database   │
└─────────────┘      └──────────────┘      └─────────────┘
                          │
                          ▼
                    ┌──────────────┐
                    │    Nginx     │
                    │   (Proxy)    │
                    └──────────────┘
```

## Database Schema

### Tables Created:

1. **users** - Employees and staff
2. **students** - Student records
3. **vendors** - Vendor registrations
4. **geofences** - Campus zones
5. **attendance_logs** - Check-in/out records
6. **gate_passes** - Exit permits
7. **leave_requests** - Leave applications
8. **shifts** - Work schedules
9. **notifications** - System alerts
10. **events** - Event management
11. **event_attendees** - Event participants
12. **material_passes** - Item movement
13. **system_settings** - Configuration

## Deployment Steps

### Option 1: Automated Full Deployment

```bash
chmod +x deploy-full-stack.sh
./deploy-full-stack.sh
```

This will:
1. Build frontend
2. Deploy frontend files
3. Deploy backend files
4. Install dependencies
5. Initialize database
6. Configure PM2
7. Setup Nginx

### Option 2: Manual Step-by-Step

#### Step 1: Deploy Frontend

```bash
npm run build
rsync -avz --delete dist/ sharda@10.10.220.53:/var/www/attendance/
```

#### Step 2: Deploy Backend

```bash
rsync -avz --delete server/ sharda@10.10.220.53:/var/www/attendance/server/
```

#### Step 3: SSH to Server and Setup

```bash
ssh sharda@10.10.220.53
cd /var/www/attendance

# Install backend dependencies
cd server
npm install

# Initialize database
npm run init-db

# Create environment file
cat > .env << 'EOF'
PORT=3001
JWT_SECRET=your-secret-key-here
CORS_ORIGINS=http://10.10.220.53
NODE_ENV=production
EOF

# Start with PM2
sudo npm install -g pm2
pm2 start server.js --name omniguard-api
pm2 save
sudo pm2 startup systemd
```

#### Step 4: Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/attendance << 'EOF'
server {
    listen 80 default_server;
    server_name 10.10.220.53 localhost;

    root /var/www/attendance;
    index index.html;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/attendance /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/bulk` - Bulk import

### Attendance
- `GET /api/attendance` - List logs
- `POST /api/attendance` - Create log

### Gate Passes
- `GET /api/gate-passes` - List passes
- `POST /api/gate-passes` - Create pass
- `PUT /api/gate-passes/:id/status` - Update status

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `GET /api/events/:id/attendees` - List attendees
- `POST /api/events/:id/attendees` - Add attendees
- `PUT /api/events/:id/attendees/:id/status` - Scan QR

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

## Database Location

```
/var/www/attendance/server/database/
└── omniguard.db  (SQLite file)
```

## Backup Database

```bash
# SSH to server
ssh sharda@10.10.220.53

# Backup
cp /var/www/attendance/server/database/omniguard.db ~/backup-$(date +%Y%m%d).db

# Or download to local
scp sharda@10.10.220.53:/var/www/attendance/server/database/omniguard.db ./backup.db
```

## Reset Database

```bash
# SSH to server
ssh sharda@10.10.220.53
cd /var/www/attendance/server

# Stop backend
pm2 stop omniguard-api

# Delete database
rm database/omniguard.db

# Re-initialize
npm run init-db

# Restart
pm2 start omniguard-api
```

## Troubleshooting

### API Not Responding
```bash
# Check PM2 status
pm2 status
pm2 logs omniguard-api

# Restart API
pm2 restart omniguard-api
```

### Database Locked
```bash
# Stop API, delete WAL files, restart
pm2 stop omniguard-api
rm database/*.db-journal database/*.db-wal database/*.db-shm
pm2 start omniguard-api
```

### Permission Denied
```bash
sudo chown -R www-data:www-data /var/www/attendance
sudo chmod -R 755 /var/www/attendance
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | API server port | 3001 |
| JWT_SECRET | Secret for JWT tokens | Required |
| CORS_ORIGINS | Allowed CORS origins | * |
| NODE_ENV | Environment mode | development |

## Default Admin

After first deployment, login with:
- **Email**: admin@campus.edu
- **Password**: admin123

Then change password immediately!

## Monitoring

```bash
# API Status
pm2 status
pm2 monit

# Logs
pm2 logs omniguard-api

# Database size
ls -lh /var/www/attendance/server/database/
```
