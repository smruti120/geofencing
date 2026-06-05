/**
 * OmniGuard — MySQL Database Initialiser
 * Run once: node init-db.js
 * Creates all tables and seeds the default admin account.
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function init() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'omniguard',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'omniguard',
    multipleStatements: true,
  });

  console.log('Connected to MySQL. Creating tables...');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id              VARCHAR(64)  PRIMARY KEY,
      name            VARCHAR(255) NOT NULL,
      email           VARCHAR(255) UNIQUE NOT NULL,
      phone           VARCHAR(50),
      password        VARCHAR(255) NOT NULL,
      role            ENUM('Admin','HR','Security','HOD','Staff','Student','Vendor') NOT NULL DEFAULT 'Staff',
      department      VARCHAR(100),
      designation     VARCHAR(100),
      reporting_manager VARCHAR(100),
      rfid_card       VARCHAR(100),
      mac_address     VARCHAR(50),
      wifi_ssid       VARCHAR(100) DEFAULT 'CAMPUS_SECURE_5G',
      gps_lat         DOUBLE DEFAULT 0,
      gps_lng         DOUBLE DEFAULT 0,
      avatar_url      TEXT,
      face_registered TINYINT(1) DEFAULT 0,
      liveness_registered_at DATETIME,
      is_active       TINYINT(1) DEFAULT 1,
      created_at      DATETIME DEFAULT NOW(),
      updated_at      DATETIME DEFAULT NOW() ON UPDATE NOW()
    );

    CREATE TABLE IF NOT EXISTS attendance_logs (
      id              VARCHAR(64)  PRIMARY KEY,
      user_id         VARCHAR(64)  NOT NULL,
      user_name       VARCHAR(255),
      department      VARCHAR(100),
      photo_url       TEXT,
      liveness_score  DOUBLE,
      gps_lat         DOUBLE,
      gps_lng         DOUBLE,
      gps_accuracy    DOUBLE,
      gps_status      VARCHAR(50),
      ssid_matched    VARCHAR(100),
      wifi_status     VARCHAR(50),
      method          VARCHAR(50),
      status          VARCHAR(50),
      timestamp       DATETIME DEFAULT NOW(),
      INDEX idx_user_id (user_id),
      INDEX idx_timestamp (timestamp)
    );

    CREATE TABLE IF NOT EXISTS gate_passes (
      id                  VARCHAR(64) PRIMARY KEY,
      user_id             VARCHAR(64) NOT NULL,
      user_name           VARCHAR(255),
      department          VARCHAR(100),
      reason              VARCHAR(100),
      pass_type           VARCHAR(50),
      status              VARCHAR(50) DEFAULT 'Pending',
      valid_duration_hours INT DEFAULT 4,
      authorized_by       VARCHAR(255),
      qr_code_val         VARCHAR(255),
      request_time        DATETIME DEFAULT NOW(),
      approve_time        DATETIME,
      out_time            DATETIME,
      in_time             DATETIME,
      expiry_time         DATETIME,
      INDEX idx_user_id (user_id),
      INDEX idx_status (status)
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id              VARCHAR(64) PRIMARY KEY,
      user_id         VARCHAR(64) NOT NULL,
      user_name       VARCHAR(255),
      department      VARCHAR(100),
      leave_type      VARCHAR(100),
      start_date      DATE,
      end_date        DATE,
      total_days      INT,
      reason          TEXT,
      status          VARCHAR(50) DEFAULT 'Pending',
      approver_notes  TEXT,
      request_date    DATETIME DEFAULT NOW(),
      INDEX idx_user_id (user_id),
      INDEX idx_status (status)
    );

    CREATE TABLE IF NOT EXISTS geofences (
      id                VARCHAR(64) PRIMARY KEY,
      name              VARCHAR(255) NOT NULL,
      description       TEXT,
      latitude          DOUBLE NOT NULL,
      longitude         DOUBLE NOT NULL,
      radius            INT NOT NULL,
      allowed_wifi_ssid TEXT,
      qr_code_payload   VARCHAR(255),
      active_count      INT DEFAULT 0,
      is_active         TINYINT(1) DEFAULT 1,
      created_at        DATETIME DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id            VARCHAR(64) PRIMARY KEY,
      recipient_id  VARCHAR(64) NOT NULL,
      title         VARCHAR(255),
      message       TEXT,
      type          VARCHAR(50) DEFAULT 'info',
      is_read       TINYINT(1) DEFAULT 0,
      timestamp     DATETIME DEFAULT NOW(),
      INDEX idx_recipient (recipient_id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id                VARCHAR(64) PRIMARY KEY,
      name              VARCHAR(255) NOT NULL,
      description       TEXT,
      event_date        DATE,
      start_time        VARCHAR(20),
      end_time          VARCHAR(20),
      location          VARCHAR(255),
      expiry_timestamp  DATETIME,
      created_at        DATETIME DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS event_attendees (
      id          VARCHAR(64) PRIMARY KEY,
      event_id    VARCHAR(64) NOT NULL,
      student_id  VARCHAR(64),
      name        VARCHAR(255),
      department  VARCHAR(100),
      course      VARCHAR(100),
      batch       VARCHAR(50),
      mobile      VARCHAR(50),
      email       VARCHAR(255),
      qr_code     VARCHAR(255),
      status      VARCHAR(50) DEFAULT 'Registered',
      entry_time  DATETIME,
      exit_time   DATETIME,
      INDEX idx_event_id (event_id)
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id                        INT PRIMARY KEY DEFAULT 1,
      liveness_threshold        INT DEFAULT 85,
      gps_tolerance             INT DEFAULT 15,
      wifi_enforcement          VARCHAR(50) DEFAULT 'Warn Mismatch',
      gate_pass_auto_timeout    INT DEFAULT 4,
      face_matching_sensitivity VARCHAR(20) DEFAULT 'High',
      security_level            VARCHAR(100) DEFAULT 'High (Face + GPS + WiFi)',
      updated_at                DATETIME DEFAULT NOW()
    );

    INSERT IGNORE INTO system_settings (id) VALUES (1);
  `);

  console.log('Tables created.');

  // Seed default admin only if no users exist
  const [rows] = await conn.query('SELECT COUNT(*) as cnt FROM users');
  if (rows[0].cnt === 0) {
    const DEFAULT_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD;
    if (!DEFAULT_ADMIN_PASSWORD) {
      console.error('Set INITIAL_ADMIN_PASSWORD in .env to seed the admin account.');
      await conn.end();
      process.exit(1);
    }
    const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
    await conn.query(
      `INSERT INTO users (id, name, email, phone, password, role, department, face_registered)
       VALUES (?, ?, ?, ?, ?, 'Admin', 'IT Administration', 0)`,
      ['EMP-ADMIN-001', 'System Administrator', process.env.INITIAL_ADMIN_EMAIL || 'admin@campus.edu', '', hash]
    );
    console.log('Default admin account created. Log in and change password immediately.');
  } else {
    console.log('Users already exist — skipping seed.');
  }

  await conn.end();
  console.log('Database initialisation complete.');
}

init().catch(err => { console.error('Init failed:', err); process.exit(1); });
