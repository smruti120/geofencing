export type SystemRole = 'Admin' | 'HR' | 'Security' | 'HOD' | 'Staff' | 'Student' | 'Vendor';

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  avatarUrl: string;
  rfidCardNumber: string;
  macAddress: string;
  allowedWifiSSID: string;
  gpsCoords: {
    lat: number;
    lng: number;
  };
  faceRegistered: boolean;
  livenessRegisteredAt?: string;
  reportingManager?: string;
  assignedSystemRole: SystemRole;
}

export interface Student {
  id: string;
  name: string;
  course: string;
  department: string;
  email: string;
  avatarUrl: string;
  rfidCardNumber: string;
  faceRegistered: boolean;
}

export interface Vendor {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  vehicleNumber: string;
  purpose: string;
  status: 'Pending' | 'Approved' | 'On-Site' | 'Exited' | 'Rejected';
  entryTime?: string;
  exitTime?: string;
}

export interface MaterialGatePass {
  id: string;
  itemName: string;
  quantity: number;
  department: string;
  direction: 'Inward' | 'Outward';
  requestedBy: string;
  status: 'Pending' | 'Approved' | 'Completed' | 'Rejected';
  photoUrl?: string;
  requestTime: string;
  approvedBy?: string;
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  timestamp: string;
  photoUrl: string;
  livenessScore: number;
  gpsCoords: {
    lat: number;
    lng: number;
  };
  gpsAccuracy: number; // in meters
  gpsStatus: 'Exact' | 'Deviation' | 'Out of Bounds';
  ssidMatched: string;
  wifiStatus: 'Secure WiFi' | 'Unsecured/cellular' | 'Mismatch';
  method: 'QR Scan' | 'Face ID' | 'Geo-Auto';
  status: 'Present' | 'Late' | 'Flagged' | 'Gate Pass Out';
}

export interface GatePass {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  reason: 'Official Duty' | 'Medical Emergency' | 'Personal Leave' | 'Lunch Break' | 'Client Meeting';
  type: 'Out & Back' | 'One Way';
  status: 'Pending' | 'Approved' | 'Rejected' | 'Active Out' | 'Returned' | 'Expired';
  requestTime: string;
  approveTime?: string;
  outTime?: string;
  inTime?: string;
  validDurationHours: number;
  authorizedBy?: string;
  expiryTime?: string; // ISO Date string
  qrCodeVal: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  type: 'Casual Leave' | 'Sick Leave' | 'Earned Leave' | 'Duty Leave' | 'Short Leave' | 'Outdoor Duty';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestDate: string;
  approverNotes?: string;
}

export interface Shift {
  id: string;
  employeeId: string;
  day: string; // YYYY-MM-DD
  shiftName: string; // "General Day Shift", "Morning Shift", "Night Vigil Shift", "Weekend Support"
  timeString: string; // "09:00 AM - 05:00 PM"
  swapRequest?: {
    swapWithEmployeeId: string;
    swapWithEmployeeName: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    dateRequested: string;
  };
}

export interface GeofenceZone {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  radius: number; // In meters
  allowedWifiSSID: string[];
  activeCount: number;
  qrCodePayload: string;
}

export interface SystemSettings {
  livenessThreshold: number; // e.g., 85 (for 85%)
  gpsTolerance: number; // in meters, e.g., 15
  wifiEnforcement: 'None' | 'Warn Mismatch' | 'Strict Enforce';
  gatePassAutoTimeout: number; // in hours, e.g. 4
  faceMatchingSensitivity: 'Low' | 'Medium' | 'High';
  securityLevel: 'Standard' | 'High (Face + GPS + WiFi)' | 'Maximum (Instant Lockout)';
}

export interface Notification {
  id: string;
  recipientId: string; // 'all' or specific employeeId or 'admin'
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'danger';
  timestamp: string;
  read: boolean;
}
