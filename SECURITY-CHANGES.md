# Security Changes — Enterprise Production Hardening

## Critical Issues Fixed

### 1. Role Switching REMOVED (Critical)
**Before:** A logged-in HR, Security, or any user could select "Admin" from a dropdown 
in the header and instantly gain full Admin access without any authentication.

**Fix:**
- Removed the role-switcher `<select>` dropdown from the header entirely.
- Role is now a **read-only badge** showing only the user's assigned role.
- `currentRole` is set once at login from the server JWT payload and never 
  changes during the session.
- Server-side: `role` in the JWT is sourced exclusively from the MySQL database 
  (`users.role` column). The client cannot influence it.

### 2. Demo Credentials REMOVED (Critical)
**Before:** The login page had a "Quick Demo Login" panel with 7 clickable buttons 
that auto-filled `admin/admin123`, `hr/hr123`, `security/sec123` etc. — exposing 
all credentials to anyone who opened the app.

**Fix:**
- Removed all hardcoded `demoCredentials` from the frontend.
- Removed all quick-login buttons from the LoginPage.
- Login now calls `/api/auth/login` with real DB-validated credentials only.

### 3. OTP Login Fixed (High)
**Before:** OTP login always assigned `role: 'Staff'` regardless of who logged in, 
and accepted the hardcoded value `123456` as the OTP for any user.

**Fix:**
- Added `/api/auth/request-otp` endpoint: generates a cryptographically random 
  6-digit OTP, bcrypt-hashes it, stores it with 5-minute expiry and attempt counter.
- Added `/api/auth/verify-otp` endpoint: validates OTP, rate-limits to 5 attempts, 
  returns JWT with the user's real DB-assigned role.
- OTP is consumed on first successful use (one-time).

### 4. Server: Role-Based Authorization (High)
**Before:** All API endpoints were protected only by `authenticateToken` (any logged-in 
user could call any endpoint — e.g., a Vendor could call `/api/settings` to read or 
change system configuration).

**Fix:** Added `requireRole(roles)` middleware applied per-endpoint:
- `GET /api/users` — Admin, HR only
- `PUT /api/users/:id` — Admin only; self-role-change blocked
- `POST /api/users` — Admin only; role validated against allowlist
- `PUT /api/settings` — Admin only
- `GET /api/settings` — Admin only
- `POST/PUT /api/geofences` — Admin only
- `PUT /api/gate-passes/:id/status` — Admin, HR, Security, HOD only
- `PUT /api/leaves/:id/status` — Admin, HR, HOD only
- `GET /api/dashboard/stats` — Admin, HR, Security, HOD only
- Non-privileged users see **only their own** attendance, gate passes, and leave records

### 5. SQLite → MySQL (Medium)
**Before:** Server used SQLite (file-based, single-writer, no access control).

**Fix:** Migrated to `mysql2` connection pool. `init-db.js` creates all tables 
with proper indexes and foreign key support on MySQL/MariaDB.

### 6. Demo Persona Dropdown REMOVED (Medium)
**Before:** After login, HR/Security/HOD users could impersonate any employee 
via a "Demo Persona Dropdown" in the header.

**Fix:** Persona dropdown removed. Employee identity is bound to the authenticated 
user's ID from the JWT.

### 7. Sandbox Simulation Panel Hidden by Default (Low)
**Before:** "Sandbox Telemetry Sensors" panel was visible by default in production, 
letting users manually spoof GPS coordinates and WiFi SSIDs.

**Fix:** Panel now defaults to `false` (hidden). It can be toggled via the Sensors 
button for legitimate testing environments.

### 8. JWT Secret Validation at Startup (High)
**Before:** Server started with a default `'your-secret-key-change-in-production'` 
JWT secret if `JWT_SECRET` was not set.

**Fix:** Server **refuses to start** if `JWT_SECRET` is missing or equals the 
default insecure value.

## Production Deployment Checklist

```bash
# 1. Generate a strong JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 2. Copy and fill env
cp server/.env.example server/.env
# Set JWT_SECRET, DB_PASSWORD, INITIAL_ADMIN_PASSWORD, ALLOWED_ORIGIN

# 3. Create MySQL DB and user
mysql -u root -p <<SQL
CREATE DATABASE omniguard CHARACTER SET utf8mb4;
CREATE USER 'omniguard'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON omniguard.* TO 'omniguard'@'localhost';
FLUSH PRIVILEGES;
SQL

# 4. Install server dependencies
cd server && npm install

# 5. Initialise DB (creates tables + default admin)
node init-db.js

# 6. Build frontend
cd .. && npm install && npm run build

# 7. Start server
cd server && node server.js
```

After first login as admin, **immediately change the admin password** and 
remove `INITIAL_ADMIN_PASSWORD` from your `.env` file.
