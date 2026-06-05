# 🚀 Quick Deploy to Production (10.10.220.53)

## Method 1: One Command Deploy (Recommended)

```bash
chmod +x deploy-full-stack.sh
./deploy-full-stack.sh
```

## Method 2: Step by Step

### 1. Build Project
```bash
npm run build
```

### 2. Deploy Files
```bash
# Frontend
rsync -avz --delete dist/ sharda@10.10.220.53:/var/www/attendance/

# Backend
rsync -avz --delete server/ sharda@10.10.220.53:/var/www/attendance/server/
```

### 3. Configure Server (SSH)
```bash
ssh sharda@10.10.220.53

# Install backend
cd /var/www/attendance/server
npm install

# Init database
npm run init-db

# Start with PM2
sudo npm install -g pm2
pm2 start server.js --name omniguard-api
pm2 save
sudo pm2 startup systemd

# Exit SSH
exit
```

### 4. Test
Open: http://10.10.220.53

Login: admin@campus.edu / admin123

---

## 📋 What's Included

### ✅ Frontend (React + Vite)
- Production build in `/dist`
- All demo data removed
- API integration ready

### ✅ Backend (Node.js + Express)
- REST API in `/server`
- SQLite database
- JWT authentication
- All CRUD endpoints

### ✅ Database (SQLite)
- Auto-initializes on first run
- 13 tables for all features
- Default admin user created
- Located at `server/database/omniguard.db`

---

## 🔧 Post-Deploy Commands

```bash
# View API logs
ssh sharda@10.10.220.53 'pm2 logs omniguard-api'

# Restart API
ssh sharda@10.10.220.53 'pm2 restart omniguard-api'

# Check status
ssh sharda@10.10.220.53 'pm2 status'

# Backup database
scp sharda@10.10.220.53:/var/www/attendance/server/database/omniguard.db ./backup.db
```

---

## 📊 Server Architecture

```
Browser → Nginx (80) → React App
                ↓
         API Calls (/api)
                ↓
         Express (3001)
                ↓
         SQLite Database
```

---

## 🎯 Next Steps After Deploy

1. **Login**: http://10.10.220.53
2. **Add Users**: Admin Portal → Bulk Import CSV
3. **Configure**: Settings → Geofences → etc.
4. **Test**: Create attendance, gate passes, events

---

## ❓ Troubleshooting

| Issue | Solution |
|-------|----------|
| Blank page | Check `pm2 logs omniguard-api` |
| 500 error | Verify nginx config: `sudo nginx -t` |
| Can't login | Check database: `ls server/database/` |
| API error | Restart: `pm2 restart omniguard-api` |

---

**Full docs**: See `DATABASE-SETUP.md` for detailed configuration.
