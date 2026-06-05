const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
  console.error('FATAL: JWT_SECRET is not set or is using the default insecure value.');
  console.error('Set a strong random JWT_SECRET in your .env file.');
  process.exit(1);
}

// --- Database pool ---
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER     || 'omniguard',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'omniguard',
  waitForConnections: true,
  connectionLimit: 10,
});

// Test DB connection on startup
pool.getConnection()
  .then(conn => { console.log('Connected to MySQL database'); conn.release(); })
  .catch(err => { console.error('MySQL connection failed:', err.message); process.exit(1); });

// --- Middleware ---
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../dist')));

// --- Auth middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// --- Role-based authorization factory ---
// Usage: requireRole('Admin') or requireRole(['Admin','HR'])
const requireRole = (allowedRoles) => (req, res, next) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Access denied. Required role(s): ${roles.join(', ')}` });
  }
  next();
};

// In-memory OTP store (use Redis in high-scale production)
const otpStore = new Map(); // key: identifier, value: { hash, expiry, attempts }
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_MAX_ATTEMPTS = 5;

// ===== AUTH ROUTES =====

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE (email = ? OR id = ?) AND is_active = 1',
      [email.trim(), email.trim()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    // Role is sourced exclusively from the database — never from client input
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,       // DB-authoritative role
        department: user.department,
        avatar_url: user.avatar_url,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/request-otp
app.post('/api/auth/request-otp', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Email or mobile is required' });

  try {
    const [rows] = await pool.query(
      'SELECT id, email, phone, name FROM users WHERE (email = ? OR phone = ?) AND is_active = 1',
      [identifier.trim(), identifier.trim()]
    );
    // Always return success to prevent user enumeration
    if (!rows[0]) {
      return res.json({ message: 'If this account exists, an OTP has been sent.' });
    }

    const otpPlain = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otpPlain, 8);
    otpStore.set(identifier.trim(), { hash: otpHash, expiry: Date.now() + OTP_EXPIRY_MS, attempts: 0, userId: rows[0].id });

    // TODO: send OTP via SMS/email service — log to console in dev only
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV OTP] ${identifier} → ${otpPlain}`);
    }
    // In production: await sendSMS(rows[0].phone, otpPlain) / sendEmail(rows[0].email, otpPlain)

    res.json({ message: 'OTP sent to your registered contact.' });
  } catch (err) {
    console.error('OTP request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/verify-otp
app.post('/api/auth/verify-otp', async (req, res) => {
  const { identifier, otp } = req.body;
  if (!identifier || !otp) return res.status(400).json({ error: 'Identifier and OTP are required' });

  const record = otpStore.get(identifier.trim());
  if (!record) return res.status(401).json({ error: 'OTP not found or expired. Request a new one.' });

  if (Date.now() > record.expiry) {
    otpStore.delete(identifier.trim());
    return res.status(401).json({ error: 'OTP expired. Please request a new one.' });
  }

  record.attempts += 1;
  if (record.attempts > OTP_MAX_ATTEMPTS) {
    otpStore.delete(identifier.trim());
    return res.status(429).json({ error: 'Too many failed attempts. Request a new OTP.' });
  }

  const valid = await bcrypt.compare(otp, record.hash);
  if (!valid) return res.status(401).json({ error: 'Invalid OTP' });

  otpStore.delete(identifier.trim());

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? AND is_active = 1', [record.userId]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Account not found' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department, avatar_url: user.avatar_url }
    });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== USERS ROUTES =====

// GET /api/users — Admin + HR only
app.get('/api/users', authenticateToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, role, department, designation, reporting_manager, avatar_url, rfid_card, face_registered, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/users/:id — own record OR Admin/HR
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  const isSelf = req.user.id === req.params.id;
  const isPrivileged = ['Admin', 'HR'].includes(req.user.role);
  if (!isSelf && !isPrivileged) return res.status(403).json({ error: 'Access denied' });

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    const user = { ...rows[0] };
    delete user.password;
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users — Admin only
app.post('/api/users', authenticateToken, requireRole('Admin'), async (req, res) => {
  const { name, email, phone, password, role, department, designation, reporting_manager, rfid_card, mac_address, wifi_ssid, gps_lat, gps_lng } = req.body;
  if (!name || !email || !role) return res.status(400).json({ error: 'name, email, role are required' });

  // Enforce only valid roles
  const validRoles = ['Admin', 'HR', 'Security', 'HOD', 'Staff', 'Student', 'Vendor'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  try {
    const hashedPassword = await bcrypt.hash(password || crypto.randomBytes(16).toString('hex'), 12);
    const id = `EMP-${Date.now()}`;
    await pool.query(
      `INSERT INTO users (id, name, email, phone, password, role, department, designation, reporting_manager, rfid_card, mac_address, wifi_ssid, gps_lat, gps_lng, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, email, phone, hashedPassword, role, department, designation, reporting_manager, rfid_card, mac_address, wifi_ssid || 'CAMPUS_SECURE_5G', gps_lat || 0, gps_lng || 0,
       `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`]
    );
    res.status(201).json({ id, message: 'User created successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/users/:id — Admin only; role field is protected (cannot self-escalate)
app.put('/api/users/:id', authenticateToken, requireRole('Admin'), async (req, res) => {
  const { name, email, phone, role, department, designation, reporting_manager, is_active } = req.body;

  const validRoles = ['Admin', 'HR', 'Security', 'HOD', 'Staff', 'Student', 'Vendor'];
  if (role && !validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  // Prevent Admin from demoting themselves (locks out the system)
  if (req.params.id === req.user.id && role && role !== req.user.role) {
    return res.status(403).json({ error: 'You cannot change your own role.' });
  }

  try {
    await pool.query(
      `UPDATE users SET name=?, email=?, phone=?, role=?, department=?, designation=?, reporting_manager=?, is_active=?, updated_at=NOW() WHERE id=?`,
      [name, email, phone, role, department, designation, reporting_manager, is_active, req.params.id]
    );
    res.json({ message: 'User updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== ATTENDANCE ROUTES =====

app.get('/api/attendance', authenticateToken, async (req, res) => {
  const { user_id, date_from, date_to } = req.query;
  const isPrivileged = ['Admin', 'HR', 'Security', 'HOD'].includes(req.user.role);

  // Non-privileged users can only see their own records
  const effectiveUserId = isPrivileged ? user_id : req.user.id;

  let query = 'SELECT * FROM attendance_logs WHERE 1=1';
  const params = [];
  if (effectiveUserId) { query += ' AND user_id = ?'; params.push(effectiveUserId); }
  if (date_from) { query += ' AND DATE(timestamp) >= ?'; params.push(date_from); }
  if (date_to) { query += ' AND DATE(timestamp) <= ?'; params.push(date_to); }
  query += ' ORDER BY timestamp DESC';

  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/attendance', authenticateToken, async (req, res) => {
  const { user_id, user_name, department, photo_url, liveness_score, gps_lat, gps_lng, gps_accuracy, gps_status, ssid_matched, wifi_status, method, status } = req.body;

  // Users can only log attendance for themselves
  if (req.user.id !== user_id && !['Admin', 'Security'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Cannot log attendance for another user' });
  }

  const id = `LOG-${Date.now()}`;
  try {
    await pool.query(
      `INSERT INTO attendance_logs (id, user_id, user_name, department, photo_url, liveness_score, gps_lat, gps_lng, gps_accuracy, gps_status, ssid_matched, wifi_status, method, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user_id, user_name, department, photo_url, liveness_score, gps_lat, gps_lng, gps_accuracy, gps_status, ssid_matched, wifi_status, method, status]
    );
    res.status(201).json({ id, message: 'Attendance recorded successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== GATE PASSES =====

app.get('/api/gate-passes', authenticateToken, async (req, res) => {
  const isPrivileged = ['Admin', 'HR', 'Security', 'HOD'].includes(req.user.role);
  let query = 'SELECT * FROM gate_passes';
  const params = [];
  if (!isPrivileged) { query += ' WHERE user_id = ?'; params.push(req.user.id); }
  query += ' ORDER BY request_time DESC';

  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/gate-passes', authenticateToken, async (req, res) => {
  const { user_id, user_name, department, reason, pass_type, valid_duration_hours } = req.body;
  if (req.user.id !== user_id && !['Admin', 'HR'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Cannot create gate pass for another user' });
  }
  const id = `PASS-${Date.now()}`;
  const qr_code_val = `GATEPASS-${id}-${crypto.randomBytes(8).toString('hex')}`;
  try {
    await pool.query(
      `INSERT INTO gate_passes (id, user_id, user_name, department, reason, pass_type, valid_duration_hours, qr_code_val) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user_id, user_name, department, reason, pass_type, valid_duration_hours, qr_code_val]
    );
    res.status(201).json({ id, qr_code_val, message: 'Gate pass created successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/gate-passes/:id/status', authenticateToken, requireRole(['Admin', 'HR', 'Security', 'HOD']), async (req, res) => {
  const { status, authorized_by } = req.body;
  let query = 'UPDATE gate_passes SET status = ?';
  const params = [status];
  if (status === 'Approved') { query += ', approve_time = NOW(), authorized_by = ?'; params.push(authorized_by); }
  else if (status === 'Active Out') { query += ', out_time = NOW()'; }
  else if (status === 'Returned') { query += ', in_time = NOW()'; }
  query += ' WHERE id = ?'; params.push(req.params.id);
  try {
    await pool.query(query, params);
    res.json({ message: 'Gate pass status updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== GEOFENCES =====

app.get('/api/geofences', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM geofences WHERE is_active = 1');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/geofences', authenticateToken, requireRole('Admin'), async (req, res) => {
  const { name, description, latitude, longitude, radius, allowed_wifi_ssid } = req.body;
  const id = `ZONE-${Date.now()}`;
  const qr_code_payload = `GATEWAY_${(name || '').toUpperCase().replace(/\s+/g, '_')}_LOCK`;
  try {
    await pool.query(
      `INSERT INTO geofences (id, name, description, latitude, longitude, radius, allowed_wifi_ssid, qr_code_payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, latitude, longitude, radius, allowed_wifi_ssid, qr_code_payload]
    );
    res.status(201).json({ id, message: 'Geofence created successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/geofences/:id', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    await pool.query('UPDATE geofences SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Geofence deactivated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== LEAVES =====

app.get('/api/leaves', authenticateToken, async (req, res) => {
  const isPrivileged = ['Admin', 'HR', 'HOD'].includes(req.user.role);
  let query = 'SELECT * FROM leave_requests';
  const params = [];
  if (!isPrivileged) { query += ' WHERE user_id = ?'; params.push(req.user.id); }
  query += ' ORDER BY request_date DESC';
  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/leaves', authenticateToken, async (req, res) => {
  const { user_id, user_name, department, leave_type, start_date, end_date, total_days, reason } = req.body;
  if (req.user.id !== user_id && !['Admin', 'HR'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Cannot submit leave for another user' });
  }
  const id = `LV-${Date.now()}`;
  try {
    await pool.query(
      `INSERT INTO leave_requests (id, user_id, user_name, department, leave_type, start_date, end_date, total_days, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user_id, user_name, department, leave_type, start_date, end_date, total_days, reason]
    );
    res.status(201).json({ id, message: 'Leave request submitted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/leaves/:id/status', authenticateToken, requireRole(['Admin', 'HR', 'HOD']), async (req, res) => {
  const { status, approver_notes } = req.body;
  try {
    await pool.query('UPDATE leave_requests SET status = ?, approver_notes = ? WHERE id = ?', [status, approver_notes, req.params.id]);
    res.json({ message: 'Leave status updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== NOTIFICATIONS =====

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE recipient_id = ? OR recipient_id = "all" ORDER BY timestamp DESC LIMIT 50',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/notifications', authenticateToken, requireRole(['Admin', 'HR', 'Security']), async (req, res) => {
  const { recipient_id, title, message, type } = req.body;
  const id = `NT-${Date.now()}`;
  try {
    await pool.query('INSERT INTO notifications (id, recipient_id, title, message, type) VALUES (?, ?, ?, ?, ?)',
      [id, recipient_id, title, message, type || 'info']);
    res.status(201).json({ id, message: 'Notification created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND (recipient_id = ? OR recipient_id = "all")', [req.params.id, req.user.id]);
    res.json({ message: 'Notification marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== EVENTS =====

app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM events ORDER BY event_date DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/events', authenticateToken, requireRole(['Admin', 'HR']), async (req, res) => {
  const { name, description, event_date, start_time, end_time, location, expiry_timestamp } = req.body;
  const id = `EVT-${Date.now()}`;
  try {
    await pool.query(
      `INSERT INTO events (id, name, description, event_date, start_time, end_time, location, expiry_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, event_date, start_time, end_time, location, expiry_timestamp]
    );
    res.status(201).json({ id, message: 'Event created successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/events/:id/attendees', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM event_attendees WHERE event_id = ?', [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/events/:id/attendees', authenticateToken, requireRole(['Admin', 'HR']), async (req, res) => {
  const attendees = req.body.attendees;
  const event_id = req.params.id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const attendee of attendees) {
      const id = `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const qr_code = `EVENT-${event_id}-${attendee.student_id}-${crypto.randomBytes(4).toString('hex')}`;
      await conn.query(
        `INSERT INTO event_attendees (id, event_id, student_id, name, department, course, batch, mobile, email, qr_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, event_id, attendee.student_id, attendee.name, attendee.department, attendee.course, attendee.batch, attendee.mobile, attendee.email, qr_code]
      );
    }
    await conn.commit();
    res.json({ message: `${attendees.length} attendees added` });
  } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); }
  finally { conn.release(); }
});

app.put('/api/events/:event_id/attendees/:attendee_id/status', authenticateToken, requireRole(['Admin', 'HR', 'Security']), async (req, res) => {
  const { status, entry_time, exit_time } = req.body;
  try {
    await pool.query(
      'UPDATE event_attendees SET status = ?, entry_time = ?, exit_time = ? WHERE id = ? AND event_id = ?',
      [status, entry_time, exit_time, req.params.attendee_id, req.params.event_id]
    );
    res.json({ message: 'Attendee status updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== SYSTEM SETTINGS — Admin only =====

app.get('/api/settings', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM system_settings WHERE id = 1');
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/settings', authenticateToken, requireRole('Admin'), async (req, res) => {
  const { liveness_threshold, gps_tolerance, wifi_enforcement, gate_pass_auto_timeout, face_matching_sensitivity, security_level } = req.body;
  try {
    await pool.query(
      `UPDATE system_settings SET liveness_threshold=?, gps_tolerance=?, wifi_enforcement=?, gate_pass_auto_timeout=?, face_matching_sensitivity=?, security_level=?, updated_at=NOW() WHERE id=1`,
      [liveness_threshold, gps_tolerance, wifi_enforcement, gate_pass_auto_timeout, face_matching_sensitivity, security_level]
    );
    res.json({ message: 'Settings updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== DASHBOARD STATS — privileged roles =====

app.get('/api/dashboard/stats', authenticateToken, requireRole(['Admin', 'HR', 'Security', 'HOD']), async (req, res) => {
  try {
    const [[users]]     = await pool.query('SELECT COUNT(*) as total FROM users WHERE is_active = 1');
    const [[faces]]     = await pool.query('SELECT COUNT(*) as total FROM users WHERE face_registered = 1');
    const [[today]]     = await pool.query('SELECT COUNT(*) as total FROM attendance_logs WHERE DATE(timestamp) = CURDATE()');
    const [[pendingGP]] = await pool.query('SELECT COUNT(*) as total FROM gate_passes WHERE status = "Pending"');
    const [[pendingLV]] = await pool.query('SELECT COUNT(*) as total FROM leave_requests WHERE status = "Pending"');

    res.json({
      total_users: users.total,
      face_registered: faces.total,
      today_attendance: today.total,
      pending_gate_passes: pendingGP.total,
      pending_leaves: pendingLV.total,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== SERVE REACT APP =====
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   OmniGuard Production Server — Port ${PORT}       ║
╠══════════════════════════════════════════════════╣
║  Role-Based Access Control: ENFORCED             ║
║  Role Switching: DISABLED                        ║
║  Demo Credentials: REMOVED                       ║
╚══════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  pool.end();
  process.exit(0);
});
