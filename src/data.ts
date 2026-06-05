import { Employee, AttendanceLog, GatePass, LeaveRequest, Shift, GeofenceZone, SystemSettings, Notification, Student, Vendor, MaterialGatePass } from './types';

// Campus center coordinates
export const CAMPUS_CENTER = {
  lat: 37.4275,
  lng: -122.1697
};

// System Settings - Production defaults
export const INITIAL_SETTINGS: SystemSettings = {
  livenessThreshold: 92,
  gpsTolerance: 20,
  wifiEnforcement: 'Warn Mismatch',
  gatePassAutoTimeout: 6,
  faceMatchingSensitivity: 'High',
  securityLevel: 'High (Face + GPS + WiFi)'
};

// Empty arrays for production - data will be populated via Admin Portal
export const MOCK_EMPLOYEES: Employee[] = [];

export const MOCK_STUDENTS: Student[] = [];

export const MOCK_VENDORS: Vendor[] = [];

export const MOCK_MATERIAL_PASSES: MaterialGatePass[] = [];

export const MOCK_GEOFENCES: GeofenceZone[] = [];

export const MOCK_ATTENDANCE_LOGS: AttendanceLog[] = [];

export const MOCK_GATE_PASSES: GatePass[] = [];

export const MOCK_LEAVES: LeaveRequest[] = [];

export const MOCK_SHIFTS: Shift[] = [];

export const MOCK_NOTIFICATIONS: Notification[] = [];

// Leave balances - will be calculated dynamically
export const LEAVE_BALANCES: Record<string, { casual: number; sick: number; earned: number }> = {};
