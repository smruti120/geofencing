# 🚀 Production Deployment Guide

## Server Details
- **IP**: 10.10.220.53
- **Path**: /var/www/attendance
- **User**: sharda

## Quick Deploy

Run this on your local machine (where you built the project):

```bash
# Build the project
npm run build

# Deploy to server
rsync -avz --delete dist/ sharda@10.10.220.53:/var/www/attendance/

# Fix permissions via SSH
ssh sharda@10.10.220.53 "sudo chown -R www-data:www-data /var/www/attendance && sudo chmod -R 755 /var/www/attendance && sudo systemctl restart nginx"
```

## What's New (Production Ready)

✅ **All demo data removed** - Clean slate for production
✅ **Default admin user** - Login works even with empty database
✅ **Bulk import ready** - Add users via CSV
✅ **Proper error handling** - No crashes with empty data

## First Time Setup (After Deployment)

1. **Access the app**: http://10.10.220.53

2. **Login with demo credentials**:
   - Username: `admin`
   - Password: `admin123`

3. **Create your organization structure**:
   - Go to **Admin Portal**
   - Click **"Employees Roster"**
   - Use **"Create User"** or **"Bulk Import (CSV)"** to add employees

4. **CSV Format for bulk import**:
   ```csv
   EmployeeCode,Name,Designation,Department,EmailID,PhoneNo,ReportingManager,Role
   EMP-001,John Smith,Professor,Computer Science,john@campus.edu,+1-555-0101,Dr. Smith,Staff
   EMP-002,Jane Doe,HR Manager,HR,jane@campus.edu,+1-555-0102,CEO,HR
   ```

5. **Configure Geofences**:
   - Go to **Geofence & Gateways**
   - Add campus zones with GPS coordinates

6. **System Settings**:
   - Go to **Security Settings**
   - Configure liveness threshold, GPS tolerance, etc.

## Troubleshooting

### Blank Page Issue
If you see a blank page:
```bash
# SSH to server and check
ssh sharda@10.10.220.53
sudo tail -20 /var/log/nginx/error.log
ls -la /var/www/attendance/
# Should show index.html and assets folder
```

### Permission Issues
```bash
sudo chown -R www-data:www-data /var/www/attendance
sudo chmod -R 755 /var/www/attendance
sudo systemctl restart nginx
```

### Rebuild from scratch
```bash
# On server
cd /var/www/attendance
sudo rm -rf *
# Then re-deploy from local machine
```

## User Roles Available

- **Admin**: Full system control
- **HR**: Attendance & leave management
- **Security**: Gate monitoring
- **HOD**: Approvals
- **Staff**: Regular employee
- **Student**: Event attendance
- **Vendor**: Gate pass

## Default Login Credentials (Demo)

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| HR | hr | hr123 |
| Security | security | sec123 |
| HOD | hod | hod123 |
| Staff | staff | staff123 |
| Student | student | stu123 |
| Vendor | vendor | vendor123 |

**Note**: After adding real users, disable or change these demo accounts.

## File Structure on Server

```
/var/www/attendance/
├── index.html          # Main app file (~500KB)
├── assets/             # JS/CSS files
│   ├── index-xxx.js
│   └── index-xxx.css
└── (no source files)   # Clean production
```

## Next Steps

1. Add your organization logo in `src/components/LoginPage.tsx`
2. Configure email/SMS API for notifications
3. Set up HTTPS with Let's Encrypt
4. Add real GPS coordinates for your campus
5. Import all employees via CSV

## Support

For issues, check:
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- File permissions: `ls -la /var/www/attendance/`
- Nginx status: `sudo systemctl status nginx`
