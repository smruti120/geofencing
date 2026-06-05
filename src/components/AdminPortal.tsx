import React, { useState } from 'react';
import { 
  Employee, AttendanceLog, GatePass, LeaveRequest, Shift, GeofenceZone, SystemSettings, Notification, SystemRole
} from '../types';
import { 
  LayoutDashboard, Users, FileText, MapPin, BarChart3, FileSpreadsheet, ShieldCheck, 
  Settings, Search, Plus, ShieldAlert, Wifi, QrCode, Download, FileDown, Shield
} from 'lucide-react';

interface AdminPortalProps {
  employees: Employee[];
  logs: AttendanceLog[];
  gatePasses: GatePass[];
  leaves: LeaveRequest[];
  shifts: Shift[];
  settings: SystemSettings;
  geofences: GeofenceZone[];
  onUpdateSettings: (settings: SystemSettings) => void;
  onApproveGatePass: (passId: string, durationHours?: number) => void;
  onRejectGatePass: (passId: string) => void;
  onApproveLeave: (leaveId: string, notes?: string) => void;
  onRejectLeave: (leaveId: string, notes?: string) => void;
  onApproveShiftSwap: (shiftId: string) => void;
  onRejectShiftSwap: (shiftId: string) => void;
  onAddGeofence: (zone: GeofenceZone) => void;
  onDeleteGeofence: (zoneId: string) => void;
  onAddNotification: (notif: Notification) => void;
  onTriggerReportDownload: (type: 'csv' | 'pdf') => void;
  onAddEmployee: (emp: Employee) => void;
  onBulkAddEmployees: (emps: Employee[]) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  employees,
  logs,
  gatePasses,
  leaves,
  shifts,
  settings,
  geofences,
  onUpdateSettings,
  onApproveGatePass,
  onRejectGatePass,
  onApproveLeave,
  onRejectLeave,
  onApproveShiftSwap,
  onRejectShiftSwap,
  onAddGeofence,
  onDeleteGeofence,
  onAddNotification,
  onTriggerReportDownload,
  onAddEmployee,
  onBulkAddEmployees
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'attendance' | 'geofence' | 'reports' | 'analytics' | 'approvals' | 'settings'>('dashboard');
  
  // Search and filter states
  const [empSearch, setEmpSearch] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('All');
  const [logStatusFilter, setLogStatusFilter] = useState('All');
  const [logSearch, setLogSearch] = useState('');
  const [reportSearch, setReportSearch] = useState('');

  // User Creation Modals and Fields
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpDesignation, setNewEmpDesignation] = useState('');
  const [newEmpDepartment, setNewEmpDepartment] = useState('Computer Science');
  const [newEmpManager, setNewEmpManager] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<SystemRole>('Staff');
  
  // Reporting manager search
  const [managerSearch, setManagerSearch] = useState('');
  const [showManagerSuggestions, setShowManagerSuggestions] = useState(false);
  
  // ID Search for employees/students
  const [idSearch, setIdSearch] = useState('');
  const [searchResult, setSearchResult] = useState<Employee | null>(null);
  
  // Bulk raw csv/json text state
  const [bulkRawText, setBulkRawText] = useState('');

  // New Geofence Form State
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneLat, setNewZoneLat] = useState(37.4275);
  const [newZoneLng, setNewZoneLng] = useState(-122.1697);
  const [newZoneRadius, setNewZoneRadius] = useState(50);
  const [newZoneWifi, setNewZoneWifi] = useState('CAMPUS_SECURE_5G');
  const [newZoneDesc, setNewZoneDesc] = useState('');

  // QR Viewer State
  const [viewingQrZone, setViewingQrZone] = useState<GeofenceZone | null>(null);

  // Interactive Admin Override logs state
  const [overrideLogId, setOverrideLogId] = useState<string | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<'Present' | 'Late' | 'Flagged'>('Present');

  // Settings Local State (to support dynamic sliders)
  const [localLiveness, setLocalLiveness] = useState(settings.livenessThreshold);
  const [localGpsTolerance, setLocalGpsTolerance] = useState(settings.gpsTolerance);
  const [localWifiEnforce, setLocalWifiEnforce] = useState(settings.wifiEnforcement);
  const [localSecurityLvl, setLocalSecurityLvl] = useState(settings.securityLevel);

  // Calculations
  const pendingGatePasses = gatePasses.filter(pass => pass.status === 'Pending');
  const pendingLeaves = leaves.filter(l => l.status === 'Pending');
  const pendingShifts = shifts.filter(s => s.swapRequest && s.swapRequest.status === 'Pending');
  
  const totalAlerts = logs.filter(log => log.status === 'Flagged').length;
  const activeEmployeesInZones = employees.filter(emp => {
    // If coordinates fall within any geofence zone
    return geofences.some(zone => {
      const dist = 6371000 * 2 * Math.asin(Math.sqrt(
        Math.pow(Math.sin(((emp.gpsCoords.lat - zone.latitude) * Math.PI / 180) / 2), 2) +
        Math.cos(emp.gpsCoords.lat * Math.PI / 180) * Math.cos(zone.latitude * Math.PI / 180) *
        Math.pow(Math.sin(((emp.gpsCoords.lng - zone.longitude) * Math.PI / 180) / 2), 2)
      ));
      return dist <= zone.radius;
    });
  }).length;

  const handleSaveSettings = () => {
    onUpdateSettings({
      livenessThreshold: localLiveness,
      gpsTolerance: localGpsTolerance,
      wifiEnforcement: localWifiEnforce,
      gatePassAutoTimeout: settings.gatePassAutoTimeout,
      faceMatchingSensitivity: settings.faceMatchingSensitivity,
      securityLevel: localSecurityLvl
    });

    onAddNotification({
      id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
      recipientId: 'all',
      title: 'System Rules Updated',
      message: `Global security constraints updated: Liveness threshold set to ${localLiveness}%, strictness: ${localSecurityLvl}.`,
      type: 'info',
      timestamp: 'Just now',
      read: false
    });
  };

  const handleCreateZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName) return;

    const newZone: GeofenceZone = {
      id: `ZONE-${Math.floor(10 + Math.random() * 90)}`,
      name: newZoneName,
      description: newZoneDesc,
      latitude: newZoneLat,
      longitude: newZoneLng,
      radius: newZoneRadius,
      allowedWifiSSID: [newZoneWifi],
      activeCount: 0,
      qrCodePayload: `GATEWAY_${newZoneName.toUpperCase().replace(' ', '_')}_LOCK`
    };

    onAddGeofence(newZone);
    setShowZoneForm(false);
    setNewZoneName('');
    setNewZoneDesc('');

    onAddNotification({
      id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
      recipientId: 'all',
      title: 'New Geofence Enforced',
      message: `Campus zone '${newZoneName}' has been registered and locked under RFID scan protocols.`,
      type: 'success',
      timestamp: 'Just now',
      read: false
    });
  };

  // Filter Employees
  const filteredEmployees = employees.filter(emp => {
    const matchSearch = emp.name.toLowerCase().includes(empSearch.toLowerCase()) || emp.id.toLowerCase().includes(empSearch.toLowerCase());
    const matchDept = empDeptFilter === 'All' || emp.department === empDeptFilter;
    return matchSearch && matchDept;
  });

  // Filter Logs
  const filteredLogs = logs.filter(log => {
    const matchSearch = log.employeeName.toLowerCase().includes(logSearch.toLowerCase()) || log.employeeId.toLowerCase().includes(logSearch.toLowerCase());
    const matchStatus = logStatusFilter === 'All' || log.status === logStatusFilter;
    return matchSearch && matchStatus;
  });

  // Unique departments list
  const departments = ['All', ...Array.from(new Set(employees.map(e => e.department)))];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      
      {/* Left Admin Navigation Panel */}
      <div className="lg:w-64 shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-3 p-2 mb-6 border-b border-slate-800 pb-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-extrabold">
            HR
          </div>
          <div>
            <h4 className="font-bold text-sm truncate">Campus Control Hub</h4>
            <span className="text-[10px] text-violet-400 uppercase font-bold tracking-wider block">HR / Admin Portal</span>
            <span className="text-[9px] text-slate-500 block font-mono">V. 2.0.6-SECURE</span>
          </div>
        </div>

        <nav className="space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'employees', label: 'Employees Roster', icon: Users },
            { id: 'attendance', label: 'Verification Logs', icon: FileText },
            { id: 'geofence', label: 'Geofence & Gateways', icon: MapPin },
            { id: 'reports', label: 'Reports Center', icon: FileSpreadsheet },
            { id: 'analytics', label: 'Analytics & Turnout', icon: BarChart3 },
            { id: 'approvals', label: 'Approvals Desk', icon: ShieldCheck, badge: pendingGatePasses.length + pendingLeaves.length + pendingShifts.length },
            { id: 'settings', label: 'Security Settings', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                {tab.badge ? (
                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${isActive ? 'bg-white text-indigo-600' : 'bg-indigo-500/20 text-indigo-400'}`}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Live Security Level Indicator */}
        <div className="mt-8 bg-slate-950 rounded-xl border border-slate-800 p-3 text-[11px] space-y-2">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block border-b border-slate-900 pb-1.5">
            System Strictness Policy
          </span>
          
          <div className="flex items-center gap-2 text-indigo-400">
            <Shield className="w-4 h-4 shrink-0" />
            <span className="font-bold text-[10.5px]">{settings.securityLevel}</span>
          </div>

          <p className="text-[9.5px] text-slate-500 leading-relaxed">
            Biometric threshold: <span className="text-slate-300 font-semibold font-mono">{settings.livenessThreshold}%</span>. 
            SSID Lockdown: <span className="text-slate-300 font-semibold font-mono">{settings.wifiEnforcement}</span>.
          </p>
        </div>
      </div>

      {/* Main Admin Dashboard Content */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white min-w-0">
        
        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Overview widgets row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4.5 space-y-3 relative overflow-hidden">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Zone Occupancy</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                </div>
                <h3 className="text-2xl font-black font-mono text-white">{activeEmployeesInZones} / {employees.length}</h3>
                <p className="text-xs text-slate-400">Employees currently inside registered GPS Geofence sectors.</p>
              </div>

              <div className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4.5 space-y-3">
                <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Pending Gate Passes</span>
                <h3 className="text-2xl font-black font-mono text-amber-400">{pendingGatePasses.length}</h3>
                <p className="text-xs text-slate-400">Awaiting out-of-bounds departure clearance authorization.</p>
              </div>

              <div className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4.5 space-y-3">
                <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Liveness Failures</span>
                <h3 className="text-2xl font-black font-mono text-red-500">{totalAlerts}</h3>
                <p className="text-xs text-slate-400">Blink spoof attempts, camera rejections, or network mismatches.</p>
              </div>

              <div className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4.5 space-y-3">
                <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Authorized Gateways</span>
                <h3 className="text-2xl font-black font-mono text-indigo-400">{geofences.length}</h3>
                <p className="text-xs text-slate-400">Active hardware hubs scanning RFID/Gate Passes.</p>
              </div>

            </div>

            {/* Live Event Stream and Campus Map Split */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Real-Time Event Feed */}
              <div className="xl:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col h-[450px]">
                <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
                    <h3 className="font-bold text-sm uppercase tracking-wide">Live Environmental Security Stream</h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Refreshes live</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                  {logs.map((log) => (
                    <div key={log.id} className="bg-slate-900/40 border border-slate-900/80 p-3 rounded-xl flex justify-between items-center text-xs hover:bg-slate-900 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={log.photoUrl} className="w-9.5 h-9.5 rounded-lg object-cover border border-slate-800 shrink-0" alt="" />
                        <div className="min-w-0 text-left">
                          <span className="font-bold text-slate-200 block truncate">{log.employeeName}</span>
                          <span className="text-[9.5px] text-slate-500 font-mono block">
                            {log.timestamp} • Check Method: <span className="text-indigo-400 font-semibold">{log.method}</span>
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono block">
                            SSID: <span className="text-slate-300 font-semibold">"{log.ssidMatched}"</span> • Acc: ±{log.gpsAccuracy}m
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider block ${
                          log.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          log.status === 'Late' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          log.status === 'Flagged' ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' :
                          'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {log.status}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 mt-1 block">3D Score: {log.livenessScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick settings slider block */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                    <ShieldAlert className="w-4.5 h-4.5 text-indigo-400" />
                    <h3 className="font-bold text-sm text-slate-200">Quick Rules Tuner</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between mb-1 font-semibold text-slate-400 text-[11px]">
                        <span>Face Liveness Threshold</span>
                        <span className="font-mono text-indigo-400 font-bold">{localLiveness}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="80" 
                        max="99" 
                        value={localLiveness} 
                        onChange={(e) => setLocalLiveness(parseInt(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                      <span className="text-[9px] text-slate-500">Liveness scores below this trigger "Biometric Spoof" flags.</span>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1 font-semibold text-slate-400 text-[11px]">
                        <span>GPS Margin Tolerance</span>
                        <span className="font-mono text-indigo-400 font-bold">{localGpsTolerance} meters</span>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="50" 
                        value={localGpsTolerance} 
                        onChange={(e) => setLocalGpsTolerance(parseInt(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                      <span className="text-[9px] text-slate-500">Permissible GPS fluctuation before lockout alerts fire.</span>
                    </div>

                    <div>
                      <span className="block text-slate-400 font-semibold mb-1.5 text-[11px]">WiFi Network Restrictiveness</span>
                      <select
                        value={localWifiEnforce}
                        onChange={(e) => setLocalWifiEnforce(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 text-xs p-2 rounded-xl text-white"
                      >
                        <option value="None">No Restrictions (WiFi Ignored)</option>
                        <option value="Warn Mismatch">Warn Mismatch (Record discrepant networks)</option>
                        <option value="Strict Enforce">Strict Enforce (Locks Check-in without WiFi SSID match)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="w-full mt-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all active:scale-98 text-center shadow-lg shadow-indigo-600/10"
                >
                  Apply Security Lock Constraints
                </button>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: EMPLOYEES ROSTER */}
        {activeTab === 'employees' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Registered Campus Members</h2>
                <p className="text-xs text-slate-400 font-medium">Register, audit telemetry configurations, or adjust spatial positions.</p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Pre-generate a unique mock ID
                    setNewEmpId(`EMP-2026-${Math.floor(100 + Math.random() * 899)}`);
                    setShowCreateUserModal(true);
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create User
                </button>

                <button
                  onClick={() => {
                    setBulkRawText(
                      "EMP-2026-101,John Smith,Software Engineer,Computer Science,john.smith@campus.edu,+1-555-0101,Marcus Sterling,Staff\nEMP-2026-102,Sarah Jones,Lab Assistant,Bio-Engineering,sarah.jones@campus.edu,+1-555-0102,Elena Rostova,Staff\nEMP-2026-103,Mike Chen,Security Officer,Operations,mike.chen@campus.edu,+1-555-0103,Sarah Jenkins,Security"
                    );
                    setShowBulkModal(true);
                  }}
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  Bulk Import (CSV)
                </button>
              </div>
            </div>

            {/* ID Search & Filters */}
            <div className="flex flex-col gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800/60">
              {/* Quick ID Search */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400" />
                  <input
                    type="text"
                    value={idSearch}
                    onChange={(e) => {
                      setIdSearch(e.target.value);
                      if (e.target.value) {
                        const found = employees.find(emp => 
                          emp.id.toLowerCase().includes(e.target.value.toLowerCase()) ||
                          emp.rfidCardNumber.toLowerCase().includes(e.target.value.toLowerCase())
                        );
                        setSearchResult(found || null);
                      } else {
                        setSearchResult(null);
                      }
                    }}
                    placeholder="Quick search by Employee ID / System ID / RFID..."
                    className="w-full bg-slate-900 border border-indigo-500/30 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {searchResult && (
                  <button
                    onClick={() => {
                      setEditingEmployee(searchResult);
                      setShowEditModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Edit Found Employee
                  </button>
                )}
              </div>
              
              {searchResult && (
                <div className="bg-indigo-950/30 border border-indigo-500/20 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={searchResult.avatarUrl} className="w-8 h-8 rounded-lg" alt="" />
                    <div>
                      <span className="text-sm font-bold text-white">{searchResult.name}</span>
                      <span className="text-xs text-slate-400 block">{searchResult.id} • {searchResult.assignedSystemRole}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-indigo-400">Click "Edit" to modify profile</span>
                </div>
              )}
              
              {/* General Filters */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    placeholder="Filter by name..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <select
                  value={empDeptFilter}
                  onChange={(e) => setEmpDeptFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Employee Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEmployees.map((emp) => (
                <div key={emp.id} className="bg-slate-950 border border-slate-850 p-4.5 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="flex gap-3.5 items-start text-left">
                    <img src={emp.avatarUrl} className="w-12 h-12 rounded-xl object-cover border border-indigo-500/20 shrink-0" alt="" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">{emp.name}</h4>
                      <span className="text-[10px] text-indigo-400 font-bold block">{emp.role}</span>
                      
                      <div className="mt-2 space-y-1 font-mono text-[9px] text-slate-400">
                        <div>
                          <span className="text-slate-500">Email:</span> {emp.email}
                        </div>
                        <div>
                          <span className="text-slate-500">RFID Number:</span> {emp.rfidCardNumber}
                        </div>
                        <div>
                          <span className="text-slate-500">SSID Wifi:</span> "{emp.allowedWifiSSID}"
                        </div>
                        <div>
                          <span className="text-slate-500">Device MAC:</span> {emp.macAddress}
                        </div>
                        {emp.reportingManager && (
                          <div>
                            <span className="text-indigo-400 font-semibold">Reporting Mgr:</span> {emp.reportingManager}
                          </div>
                        )}
                        {emp.assignedSystemRole && (
                          <div>
                            <span className="text-violet-400 font-semibold">System Role:</span> <span className="px-1.5 py-0.5 bg-slate-900 rounded font-bold text-white border border-slate-800">{emp.assignedSystemRole}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-900 pt-3 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono">
                      <MapPin className="w-3 h-3 text-indigo-500" />
                      <span>{emp.gpsCoords.lat.toFixed(5)}, {emp.gpsCoords.lng.toFixed(5)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingEmployee(emp);
                          setShowEditModal(true);
                        }}
                        className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 rounded text-[9px] font-bold transition-all"
                      >
                        Edit Profile
                      </button>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        emp.faceRegistered ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {emp.faceRegistered ? 'Biometrics Active' : 'Awaiting Photo Setup'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {filteredEmployees.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-xs col-span-2">
                  No employees matching query filters found.
                </div>
              )}
            </div>

            {/* 1. CREATE SINGLE USER MODAL */}
            {showCreateUserModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl text-white animate-scale-up">
                  <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-indigo-400">Create Campus Member (Single)</h3>
                    <button 
                      onClick={() => setShowCreateUserModal(false)} 
                      className="text-slate-400 hover:text-white transition-all bg-slate-950/80 px-2 py-1 rounded text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newEmpName || !newEmpDesignation) return;

                      onAddEmployee({
                        id: newEmpId || `EMP-2026-${Math.floor(100 + Math.random() * 899)}`,
                        name: newEmpName,
                        role: newEmpDesignation,
                        department: newEmpDepartment,
                        email: newEmpEmail || `${newEmpName.toLowerCase().replace(/\s+/g, '')}@campus.edu`,
                        phone: newEmpPhone || '+1 (555) 999-0000',
                        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
                        rfidCardNumber: `RFID-${Math.floor(1000 + Math.random() * 8999)}-${newEmpId.split('-')[2] || 'X'}`,
                        macAddress: '00:1A:2B:' + Array.from({length: 3}, () => Math.floor(Math.random()*16).toString(16).toUpperCase() + Math.floor(Math.random()*16).toString(16).toUpperCase()).join(':'),
                        allowedWifiSSID: 'CAMPUS_SECURE_5G',
                        gpsCoords: { lat: 37.4275, lng: -122.1697 },
                        faceRegistered: true,
                        livenessRegisteredAt: 'Just now',
                        reportingManager: newEmpManager || 'Marcus Sterling',
                        assignedSystemRole: newEmpRole
                      });

                      // Clear form & close
                      setNewEmpId('');
                      setNewEmpName('');
                      setNewEmpDesignation('');
                      setNewEmpEmail('');
                      setNewEmpPhone('');
                      setNewEmpManager('');
                      setManagerSearch('');
                      setShowCreateUserModal(false);
                    }}
                    className="p-6 space-y-4 text-xs text-left"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Employee ID / Code</label>
                      <input 
                        type="text" 
                        value={newEmpId}
                        onChange={(e) => setNewEmpId(e.target.value)}
                        placeholder="e.g. EMP-2026-99" 
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                      <input 
                        type="text" 
                        value={newEmpName}
                        onChange={(e) => setNewEmpName(e.target.value)}
                        placeholder="e.g. Clara Oswald" 
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Designation</label>
                      <input 
                        type="text" 
                        value={newEmpDesignation}
                        onChange={(e) => setNewEmpDesignation(e.target.value)}
                        placeholder="e.g. Lab Coordinator" 
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email ID</label>
                        <input 
                          type="email" 
                          value={newEmpEmail}
                          onChange={(e) => setNewEmpEmail(e.target.value)}
                          placeholder="name@campus.edu" 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone No</label>
                        <input 
                          type="tel" 
                          value={newEmpPhone}
                          onChange={(e) => setNewEmpPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000" 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Designation (Role)</label>
                        <input 
                          type="text" 
                          value={newEmpDesignation}
                          onChange={(e) => setNewEmpDesignation(e.target.value)}
                          placeholder="e.g. Lab Coordinator" 
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Department</label>
                        <select 
                          value={newEmpDepartment}
                          onChange={(e) => setNewEmpDepartment(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Computer Science">Computer Science</option>
                          <option value="Bio-Engineering">Bio-Engineering</option>
                          <option value="Administration">Administration</option>
                          <option value="Information Services">Information Services</option>
                          <option value="Operations">Operations</option>
                        </select>
                      </div>
                    </div>

                    {/* Reporting Manager Searchable Dropdown */}
                    <div className="relative">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reporting Manager</label>
                      <input 
                        type="text" 
                        value={managerSearch}
                        onChange={(e) => {
                          setManagerSearch(e.target.value);
                          setShowManagerSuggestions(true);
                        }}
                        onFocus={() => setShowManagerSuggestions(true)}
                        placeholder="Type to search manager..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                      {showManagerSuggestions && managerSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl max-h-32 overflow-y-auto">
                          {employees
                            .filter(emp => emp.name.toLowerCase().includes(managerSearch.toLowerCase()))
                            .map(emp => (
                              <button
                                key={emp.id}
                                type="button"
                                onClick={() => {
                                  setNewEmpManager(emp.name);
                                  setManagerSearch(emp.name);
                                  setShowManagerSuggestions(false);
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                              >
                                <img src={emp.avatarUrl} className="w-5 h-5 rounded-full" alt="" />
                                {emp.name} ({emp.assignedSystemRole})
                              </button>
                            ))}
                          {employees.filter(emp => emp.name.toLowerCase().includes(managerSearch.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-xs text-slate-500">No managers found</div>
                          )}
                        </div>
                      )}
                      {newEmpManager && !showManagerSuggestions && (
                        <div className="mt-1 text-[10px] text-indigo-400">Selected: {newEmpManager}</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assign System Role</label>
                      <select 
                        value={newEmpRole}
                        onChange={(e) => setNewEmpRole(e.target.value as SystemRole)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold text-indigo-400 focus:outline-none"
                      >
                        <option value="Staff">Staff (Attendance & Pass)</option>
                        <option value="Student">Student (Entry Face/Card)</option>
                        <option value="Vendor">Vendor (Gate Pass)</option>
                        <option value="HOD">HOD / Approver (Approvals)</option>
                        <option value="HR">HR (Attendance & Leave)</option>
                        <option value="Security">Security (Gate & Visitors)</option>
                        <option value="Admin">Admin (Full Control)</option>
                      </select>
                    </div>

                    <div className="p-3 bg-indigo-950/40 border border-indigo-900/40 rounded-xl text-[10.5px] text-indigo-300">
                      <span className="font-bold block mb-0.5">Role Permissions Matrix:</span>
                      • <strong>User</strong>: Concerned with related dashboard items, check-ins & ID card.<br/>
                      • <strong>Security</strong>: Inspect gate pass locks & network whitelists.<br/>
                      • <strong>Manager</strong>: Review attendance reports & authorize exit gate passes.<br/>
                      • <strong>Admin</strong>: Superuser permissions to override verification verdicts & adjust global rules.
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setShowCreateUserModal(false)} 
                        className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white"
                      >
                        Register Member
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* EDIT EMPLOYEE MODAL */}
            {showEditModal && editingEmployee && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl text-white animate-scale-up max-h-[90vh] overflow-y-auto">
                  <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-indigo-400">Edit Employee Profile</h3>
                    <button 
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingEmployee(null);
                      }} 
                      className="text-slate-400 hover:text-white transition-all bg-slate-950/80 px-2 py-1 rounded text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      setShowEditModal(false);
                      setEditingEmployee(null);
                    }}
                    className="p-6 space-y-4 text-xs text-left"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <img src={editingEmployee.avatarUrl} className="w-12 h-12 rounded-xl" alt="" />
                      <div>
                        <span className="text-[10px] text-slate-400">Employee ID</span>
                        <span className="text-sm font-bold text-white block">{editingEmployee.id}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                        <input 
                          type="text" 
                          value={editingEmployee.name}
                          onChange={(e) => setEditingEmployee({...editingEmployee, name: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Designation</label>
                        <input 
                          type="text" 
                          value={editingEmployee.role}
                          onChange={(e) => setEditingEmployee({...editingEmployee, role: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email ID</label>
                        <input 
                          type="email" 
                          value={editingEmployee.email}
                          onChange={(e) => setEditingEmployee({...editingEmployee, email: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone No</label>
                        <input 
                          type="tel" 
                          value={editingEmployee.phone}
                          onChange={(e) => setEditingEmployee({...editingEmployee, phone: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Department</label>
                      <select 
                        value={editingEmployee.department}
                        onChange={(e) => setEditingEmployee({...editingEmployee, department: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Computer Science">Computer Science</option>
                        <option value="Bio-Engineering">Bio-Engineering</option>
                        <option value="Administration">Administration</option>
                        <option value="Information Services">Information Services</option>
                        <option value="Operations">Operations</option>
                      </select>
                    </div>

                    <div className="relative">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reporting Manager</label>
                      <input 
                        type="text" 
                        value={editingEmployee.reportingManager || ''}
                        onChange={(e) => {
                          setEditingEmployee({...editingEmployee, reportingManager: e.target.value});
                          setManagerSearch(e.target.value);
                          setShowManagerSuggestions(true);
                        }}
                        placeholder="Type to search and change manager..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                      {showManagerSuggestions && managerSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl max-h-32 overflow-y-auto">
                          {employees
                            .filter(emp => emp.id !== editingEmployee.id && emp.name.toLowerCase().includes(managerSearch.toLowerCase()))
                            .map(emp => (
                              <button
                                key={emp.id}
                                type="button"
                                onClick={() => {
                                  setEditingEmployee({...editingEmployee, reportingManager: emp.name});
                                  setManagerSearch('');
                                  setShowManagerSuggestions(false);
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                              >
                                <img src={emp.avatarUrl} className="w-5 h-5 rounded-full" alt="" />
                                {emp.name} ({emp.assignedSystemRole})
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">System Role</label>
                      <select 
                        value={editingEmployee.assignedSystemRole}
                        onChange={(e) => setEditingEmployee({...editingEmployee, assignedSystemRole: e.target.value as SystemRole})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold text-indigo-400 focus:outline-none"
                      >
                        <option value="Staff">Staff</option>
                        <option value="HOD">HOD</option>
                        <option value="HR">HR</option>
                        <option value="Security">Security</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowEditModal(false);
                          setEditingEmployee(null);
                        }}
                        className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 2. BULK IMPORT USERS MODAL */}
            {showBulkModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl text-white animate-scale-up">
                  <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4" />
                      Bulk Import Employees (CSV Format)
                    </h3>
                    <button 
                      onClick={() => setShowBulkModal(false)} 
                      className="text-slate-400 hover:text-white transition-all bg-slate-950/80 px-2 py-1 rounded text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-6 space-y-4 text-xs text-left">
                    <p className="text-slate-400 text-[11px]">
                      Provide comma-separated rows. Expected columns: <br />
                      <code className="text-indigo-300 font-mono">EmployeeCode,Name,Designation,Department,EmailID,PhoneNo,ReportingManager,Role</code>
                    </p>

                    <textarea 
                      rows={6}
                      value={bulkRawText}
                      onChange={(e) => setBulkRawText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                    />

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-400 space-y-1 text-[10px]">
                      <span className="font-bold block text-slate-300">CSV Format Guide</span>
                      <span>✔ EmployeeCode: Unique identifier (e.g., EMP-2026-101)</span><br/>
                      <span>✔ EmailID: Valid email address</span><br/>
                      <span>✔ PhoneNo: Contact number with country code</span><br/>
                      <span>✔ ReportingManager: Manager's full name</span><br/>
                      <span>✔ Role: Staff/Student/Vendor/HOD/HR/Security/Admin</span>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-800">
                      <button 
                        onClick={() => setShowBulkModal(false)} 
                        className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          const rows = bulkRawText.trim().split('\n');
                          const parsedEmployees: Employee[] = [];
                          
                          rows.forEach((row) => {
                            const cols = row.split(',');
                            if (cols.length >= 8) {
                              const id = cols[0].trim();
                              const name = cols[1].trim();
                              const designation = cols[2].trim();
                              const dept = cols[3].trim();
                              const email = cols[4].trim();
                              const phone = cols[5].trim();
                              const manager = cols[6].trim();
                              const roleStr = cols[7]?.trim() || 'Staff';
                              
                              parsedEmployees.push({
                                id: id || `EMP-2026-${Math.floor(100 + Math.random() * 899)}`,
                                name: name,
                                role: designation,
                                department: dept,
                                email: email || `${name.toLowerCase().replace(/\s+/g, '')}@campus.edu`,
                                phone: phone || '+1 (555) ' + Math.floor(100 + Math.random() * 899) + '-1234',
                                avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
                                rfidCardNumber: `RFID-${Math.floor(1000 + Math.random() * 9999)}`,
                                macAddress: 'CC:EE:BB:' + Math.floor(10+Math.random()*89) + ':00:FF',
                                allowedWifiSSID: 'CAMPUS_SECURE_5G',
                                gpsCoords: { lat: 37.4275, lng: -122.1697 },
                                faceRegistered: true,
                                livenessRegisteredAt: '2026-02-25 08:00 AM',
                                reportingManager: manager,
                                assignedSystemRole: (['Admin', 'HR', 'Security', 'HOD', 'Staff', 'Student', 'Vendor'].includes(roleStr) ? roleStr : 'Staff') as SystemRole
                              });
                            }
                          });

                          if (parsedEmployees.length > 0) {
                            onBulkAddEmployees(parsedEmployees);
                          }
                          setShowBulkModal(false);
                        }}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all"
                      >
                        Process Bulk Import
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VERIFICATION ATTENDANCE LOGS */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Secure Biometric Audit Log</h2>
                <p className="text-xs text-slate-400">High-fidelity tracking of physical location, networks, and face spoof checks.</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800/60">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search logs by name or ID..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late Check-ins</option>
                <option value="Flagged">Flagged Incidents</option>
                <option value="Gate Pass Out">Departed (Gate Pass Out)</option>
              </select>
            </div>

            {/* Full Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-3">Employee / Face ID</th>
                    <th className="py-3 px-3">Time Registered</th>
                    <th className="py-3 px-3">SSID Network Check</th>
                    <th className="py-3 px-3">GPS Location & Drift</th>
                    <th className="py-3 px-3">3D Liveness</th>
                    <th className="py-3 px-3 text-right">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/20 transition-all">
                      <td className="py-3 px-3 flex items-center gap-3 text-left">
                        <img src={log.photoUrl} className="w-8 h-8 rounded-lg object-cover border border-indigo-500/20 shadow shrink-0" alt="" />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-200 block truncate">{log.employeeName}</span>
                          <span className="text-[9px] text-slate-500 font-mono block">{log.employeeId}</span>
                        </div>
                      </td>
                      
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {log.timestamp}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <Wifi className="w-3 h-3 text-indigo-400" />
                          <span className="font-mono font-semibold text-[10.5px] text-slate-200">{log.ssidMatched}</span>
                        </div>
                        <span className={`text-[8.5px] block mt-0.5 ${
                          log.wifiStatus === 'Secure WiFi' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>{log.wifiStatus}</span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-slate-300">± {log.gpsAccuracy.toFixed(1)}m</span>
                        <span className={`block text-[9px] mt-0.5 font-semibold ${
                          log.gpsStatus === 'Exact' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>{log.gpsStatus}</span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-slate-300 font-bold block">{log.livenessScore}%</span>
                        <span className="text-[8.5px] text-slate-500">3D biometric signature</span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase inline-block ${
                          log.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          log.status === 'Late' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          log.status === 'Flagged' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse' :
                          'bg-slate-500/10 text-slate-400 border border-slate-800'
                        }`}>
                          {log.status}
                        </span>
                        
                        <button
                          onClick={() => {
                            setOverrideLogId(log.id);
                            setOverrideStatus(log.status as any);
                          }}
                          className="block text-[9px] text-indigo-400 font-bold hover:underline mt-1 ml-auto text-right"
                        >
                          Override Rule
                        </button>

                        {log.status === 'Late' && (
                          <button
                            onClick={() => {
                              log.status = 'Present';
                              onAddNotification({
                                id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
                                recipientId: log.employeeId,
                                title: 'Late Arrival Excused',
                                message: `Your late arrival on ${log.timestamp} has been officially authorized & approved as Present.`,
                                type: 'success',
                                timestamp: 'Just now',
                                read: false
                              });
                              // Simple state force-trigger notification feedback
                              onUpdateSettings({
                                ...settings
                              });
                            }}
                            className="block text-[9px] text-emerald-400 font-bold hover:underline mt-1 ml-auto text-right bg-emerald-500/10 border border-emerald-500/20 px-1 rounded mt-1.5"
                          >
                            Approve Late Arrival
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500">
                        No verification logs matches the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Override Dialog modal */}
            {overrideLogId && (
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl text-white p-6 space-y-4">
                  <h3 className="font-extrabold text-sm uppercase text-indigo-400">Manual Log Override Verdict</h3>
                  <p className="text-xs text-slate-400">
                    As Admin, you can override the biometrics or geofencing automatic flags due to authorized device changes or hardware replacements.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Override Status Verdict</label>
                    <select
                      value={overrideStatus}
                      onChange={(e) => setOverrideStatus(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="Present">Present (Clear All Flags)</option>
                      <option value="Late">Late Check-in</option>
                      <option value="Flagged">Flagged / Suspend Attendance</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-slate-850">
                    <button
                      onClick={() => setOverrideLogId(null)}
                      className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const targetLog = logs.find(l => l.id === overrideLogId);
                        if (targetLog) {
                          targetLog.status = overrideStatus;
                        }
                        setOverrideLogId(null);
                        onAddNotification({
                          id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
                          recipientId: 'all',
                          title: 'Manual Verdict Override',
                          message: `Admin manually overrode verification log ID ${overrideLogId} to ${overrideStatus}.`,
                          type: 'success',
                          timestamp: 'Just now',
                          read: false
                        });
                      }}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white"
                    >
                      Save Custom Verdict
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: GEOFENCES & GATEWAYS */}
        {activeTab === 'geofence' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Campus Geofence Zones</h2>
                <p className="text-xs text-slate-400">Manage coordinate perimeters, allowed campus WiFi SSIDs and gate QR tokens.</p>
              </div>
              <button
                onClick={() => setShowZoneForm(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Establish New Zone
              </button>
            </div>

            {/* Form Popup */}
            {showZoneForm && (
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl text-white p-6 space-y-4">
                  <h3 className="font-extrabold text-sm uppercase text-indigo-400">Define Geofence Boundaries</h3>
                  
                  <form onSubmit={handleCreateZone} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Zone Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Research Quad"
                        value={newZoneName}
                        onChange={(e) => setNewZoneName(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Latitude</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={newZoneLat}
                          onChange={(e) => setNewZoneLat(parseFloat(e.target.value) || 37.4275)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Longitude</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={newZoneLng}
                          onChange={(e) => setNewZoneLng(parseFloat(e.target.value) || -122.1697)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Radius (meters)</label>
                        <input
                          type="number"
                          value={newZoneRadius}
                          onChange={(e) => setNewZoneRadius(parseInt(e.target.value) || 50)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Allowed SSID Network</label>
                        <input
                          type="text"
                          value={newZoneWifi}
                          onChange={(e) => setNewZoneWifi(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={newZoneDesc}
                        placeholder="Add short sector description..."
                        onChange={(e) => setNewZoneDesc(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                      />
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-slate-850">
                      <button
                        type="button"
                        onClick={() => setShowZoneForm(false)}
                        className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white"
                      >
                        Establish Geofence
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Zones Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {geofences.map((zone) => (
                <div key={zone.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="text-left">
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-mono uppercase font-bold">
                          {zone.id}
                        </span>
                        <h3 className="font-bold text-sm text-white mt-1.5">{zone.name}</h3>
                      </div>

                      <button
                        onClick={() => setViewingQrZone(zone)}
                        className="p-2 bg-slate-900 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-all flex items-center gap-1 text-[10px] font-bold"
                        title="View Zone Gateway QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                        Scan Gateway Code
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 text-left">
                      {zone.description}
                    </p>

                    <div className="pt-2 space-y-1.5 font-mono text-[10px] text-slate-400 text-left border-t border-slate-900">
                      <div className="flex justify-between">
                        <span>Boundary Radius:</span>
                        <span className="text-slate-200 font-bold">{zone.radius} meters</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Center Coordinates:</span>
                        <span className="text-indigo-300">{zone.latitude.toFixed(5)}, {zone.longitude.toFixed(5)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Allowed SSIDs:</span>
                        <span className="text-emerald-400 truncate max-w-[150px] font-bold">
                          {zone.allowedWifiSSID.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => onDeleteGeofence(zone.id)}
                      className="flex-1 py-1.5 bg-slate-950 hover:bg-rose-900/20 hover:text-rose-400 text-slate-500 border border-slate-900 hover:border-rose-900/30 rounded-xl text-[10px] font-bold transition-all"
                    >
                      Dismantle Zone
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* QR Scanner Simulator Modal */}
            {viewingQrZone && (
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl text-white p-6 text-center space-y-4">
                  <h3 className="font-extrabold text-sm uppercase text-indigo-400">{viewingQrZone.name} Gateway Lock</h3>
                  <p className="text-xs text-slate-400">
                    Mount this QR Code at the doorway gateway reader. Employees can scan this in-app to check in or check out.
                  </p>

                  <div className="bg-white p-4 rounded-2xl inline-block">
                    <svg viewBox="0 0 100 100" className="w-40 h-40 mx-auto">
                      <rect width="100" height="100" fill="white" />
                      {/* Unique pattern depending on ID */}
                      <path d="M10 10h20v20H10zM15 15h10v10H15zM70 10h20v20H70zM75 15h10v10H75zM10 70h20v20H10zM15 75h10v10H15zM40 40h20v20H40zM45 45h10v10H45zM30 10h10v10H30zM40 20h10v10H40zM10 50h10v10H10zM60 60h10v10H60zM60 80h20v10H60z" fill="black" />
                    </svg>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[10.5px] font-mono text-slate-300 select-all">
                    {viewingQrZone.qrCodePayload}
                  </div>

                  <div>
                    <button
                      onClick={() => setViewingQrZone(null)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs"
                    >
                      Close Panel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: REPORTS CENTER */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Interactive Reports Hub</h2>
                <p className="text-xs text-slate-400">Extract printable summaries, attendance records, and device logs.</p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => onTriggerReportDownload('csv')}
                  className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <FileDown className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => onTriggerReportDownload('pdf')}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/10"
                >
                  <Download className="w-4 h-4" />
                  Print PDF Summary
                </button>
              </div>
            </div>

            {/* Search filter */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/60 relative">
              <Search className="w-4 h-4 absolute left-7 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={reportSearch}
                placeholder="Filter report records by employee name or sector..."
                onChange={(e) => setReportSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            {/* Table Mock Sheet */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-2">RFID Smart ID</th>
                    <th className="py-3 px-2">Employee</th>
                    <th className="py-3 px-2">Department</th>
                    <th className="py-3 px-2">Total Entries</th>
                    <th className="py-3 px-2">WiFi Deviations</th>
                    <th className="py-3 px-2">GPS Compliance</th>
                    <th className="py-3 px-2 text-right">Gate Pass Utilizations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs text-slate-300">
                  {employees
                    .filter(emp => emp.name.toLowerCase().includes(reportSearch.toLowerCase()) || emp.department.toLowerCase().includes(reportSearch.toLowerCase()))
                    .map((emp) => {
                      const empLogs = logs.filter(l => l.employeeId === emp.id);
                      const wifiDevs = empLogs.filter(l => l.wifiStatus === 'Mismatch').length;
                      const gpsComp = empLogs.length ? parseFloat((((empLogs.length - empLogs.filter(l => l.gpsStatus === 'Out of Bounds').length) / empLogs.length) * 100).toFixed(0)) : 100;
                      const gatePassUses = gatePasses.filter(pass => pass.employeeId === emp.id && pass.status === 'Returned').length;

                      return (
                        <tr key={emp.id} className="hover:bg-slate-800/10 transition-all">
                          <td className="py-3 px-2 font-mono text-[11px]">{emp.rfidCardNumber}</td>
                          <td className="py-3 px-2 font-bold text-white">{emp.name}</td>
                          <td className="py-3 px-2">{emp.department}</td>
                          <td className="py-3 px-2 font-mono">{empLogs.length} check-ins</td>
                          <td className={`py-3 px-2 font-mono font-bold ${wifiDevs > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{wifiDevs} alert(s)</td>
                          <td className="py-3 px-2 font-mono font-bold">{gpsComp}%</td>
                          <td className="py-3 px-2 text-right font-mono text-slate-400">{gatePassUses} passes completed</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Campus Turnout & Compliance Analytics</h2>
                <p className="text-xs text-slate-400">Live vector visualization graphs mapping spatial compliance metrics.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Compliance Bar Chart */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-left space-y-4">
                <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Department Turnout Compliance Ratio</h3>
                
                <div className="space-y-4 pt-2">
                  {[
                    { name: 'Computer Science', percentage: 96, color: 'bg-indigo-500' },
                    { name: 'Bio-Engineering', percentage: 88, color: 'bg-emerald-500' },
                    { name: 'Administration', percentage: 94, color: 'bg-cyan-500' },
                    { name: 'Information Services', percentage: 91, color: 'bg-violet-500' }
                  ].map((dept) => (
                    <div key={dept.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-slate-300">{dept.name}</span>
                        <span className="font-mono text-indigo-400 font-black">{dept.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                        <div className={`${dept.color} h-full transition-all duration-500`} style={{ width: `${dept.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hourly occupancy visual */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Hourly Campus Geofence Load (Peak hours)</h3>
                
                <div className="h-32 flex items-end gap-3.5 pt-4 border-b border-slate-900">
                  {[20, 35, 65, 98, 88, 72, 48, 15].map((load, index) => {
                    const hours = ['08AM', '10AM', '12PM', '02PM', '04PM', '06PM', '08PM', '10PM'];
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        {/* Hover Tooltip */}
                        <div className="absolute -top-6 opacity-0 group-hover:opacity-100 bg-indigo-600 text-[9px] px-1.5 py-0.5 rounded transition-all font-bold z-10 font-mono text-white">
                          {load}%
                        </div>
                        
                        <div 
                          className="w-full bg-indigo-500/25 hover:bg-indigo-500 rounded-t-md transition-all duration-500 border-t border-indigo-400/25 cursor-pointer" 
                          style={{ height: `${load}%` }}
                        ></div>
                        
                        <span className="text-[8.5px] text-slate-500 mt-2 block font-mono">{hours[index]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Liveness anti-spoof statistics */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 md:col-span-2 text-left">
                <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Biometric Integrity Summary</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-850 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block">Average Liveness Score</span>
                    <span className="text-2xl font-black font-mono text-emerald-400">96.4%</span>
                    <p className="text-[10px] text-slate-500">Average calculated eye-blink/smile vector correlation score.</p>
                  </div>

                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-850 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block">Spoof Rejection Ratio</span>
                    <span className="text-2xl font-black font-mono text-indigo-400">100%</span>
                    <p className="text-[10px] text-slate-500">Perfect record blocking replay screens and mask duplicates.</p>
                  </div>

                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-850 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block">SSID Network Lockdown</span>
                    <span className="text-2xl font-black font-mono text-amber-400">{settings.wifiEnforcement === 'Strict Enforce' ? 'Strict' : 'Permissive'}</span>
                    <p className="text-[10px] text-slate-500">Current strictness of local WiFi SSID matches required.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 7: APPROVALS QUEUE */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">HR Approval Desk</h2>
                <p className="text-xs text-slate-400">Authorize pending gate passes, coworker shift swaps, and leaves in real-time.</p>
              </div>
            </div>

            {/* Sub-split cards */}
            <div className="space-y-6">
              
              {/* 1. Pending Gate Passes */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-xs uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                  <span>1. Departure Gate Passes clearance</span>
                  <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-400 text-[9px] font-bold rounded-full">
                    {pendingGatePasses.length} pending
                  </span>
                </h3>

                <div className="space-y-3.5">
                  {pendingGatePasses.map((pass) => (
                    <div key={pass.id} className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="text-left">
                        <span className="text-[9px] bg-amber-400/10 text-amber-400 border border-amber-400/20 px-1.5 py-0.5 rounded font-bold uppercase font-mono">
                          {pass.reason} • {pass.validDurationHours} Hours Limit
                        </span>
                        <h4 className="font-bold text-sm text-white mt-2">{pass.employeeName}</h4>
                        <p className="text-xs text-slate-400">{pass.department} • Requested: {pass.requestTime}</p>
                      </div>

                      <div className="flex gap-2 self-stretch sm:self-auto">
                        <button
                          onClick={() => onRejectGatePass(pass.id)}
                          className="flex-1 sm:flex-none px-4.5 py-2 bg-slate-950 hover:bg-rose-900/20 hover:text-rose-400 border border-slate-850 hover:border-rose-900/30 rounded-xl text-xs font-bold transition-all"
                        >
                          Reject Exit
                        </button>
                        <button
                          onClick={() => onApproveGatePass(pass.id, pass.validDurationHours)}
                          className="flex-1 sm:flex-none px-4.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/10"
                        >
                          Clear Departure
                        </button>
                      </div>
                    </div>
                  ))}

                  {pendingGatePasses.length === 0 && (
                    <p className="text-center py-4 text-slate-500 text-xs">No pending gate passes.</p>
                  )}
                </div>
              </div>

              {/* 2. Leave Requests */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-xs uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                  <span>2. Academic / Medical Leave applications</span>
                  <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-400 text-[9px] font-bold rounded-full">
                    {pendingLeaves.length} pending
                  </span>
                </h3>

                <div className="space-y-3.5">
                  {pendingLeaves.map((lv) => (
                    <div key={lv.id} className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl flex flex-col justify-between gap-4 text-left">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                        <div>
                          <span className="text-[9px] bg-rose-400/10 text-rose-400 border border-rose-400/20 px-1.5 py-0.5 rounded font-bold uppercase font-mono">
                            {lv.type} • {lv.totalDays} Days
                          </span>
                          <h4 className="font-bold text-sm text-white mt-2">{lv.employeeName}</h4>
                          <p className="text-xs text-slate-400">{lv.department} • Requested: {lv.requestDate}</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                          <button
                            onClick={() => onRejectLeave(lv.id, 'Rejected due to high peak class load.')}
                            className="flex-1 sm:flex-none px-4.5 py-2 bg-slate-950 hover:bg-rose-900/20 hover:text-rose-400 border border-slate-850 hover:border-rose-900/30 rounded-xl text-xs font-bold transition-all"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => onApproveLeave(lv.id, 'Approved by Admin.')}
                            className="flex-1 sm:flex-none px-4.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/10"
                          >
                            Approve Leave
                          </button>
                        </div>
                      </div>
                      <div className="p-2.5 bg-slate-950 border border-slate-850 text-slate-400 rounded-xl italic text-xs">
                        "{lv.reason}"
                      </div>
                    </div>
                  ))}

                  {pendingLeaves.length === 0 && (
                    <p className="text-center py-4 text-slate-500 text-xs">No pending leave applications.</p>
                  )}
                </div>
              </div>

              {/* 3. Shift Swap Requests */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-xs uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                  <span>3. Coworker Shift exchanges</span>
                  <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-400 text-[9px] font-bold rounded-full">
                    {pendingShifts.length} pending
                  </span>
                </h3>

                <div className="space-y-3.5">
                  {pendingShifts.map((sf) => (
                    <div key={sf.id} className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="text-left">
                        <span className="text-[9px] bg-violet-400/10 text-violet-400 border border-violet-400/20 px-1.5 py-0.5 rounded font-bold uppercase font-mono">
                          Shift Swap
                        </span>
                        <h4 className="font-bold text-sm text-white mt-2">Shift Name: {sf.shiftName}</h4>
                        <p className="text-xs text-slate-400">
                          Requested by: <span className="text-slate-200 font-bold">{employees.find(e => e.id === sf.employeeId)?.name}</span> • Swap Partner: <span className="text-indigo-400 font-semibold">{sf.swapRequest?.swapWithEmployeeName}</span>
                        </p>
                      </div>

                      <div className="flex gap-2 self-stretch sm:self-auto">
                        <button
                          onClick={() => onRejectShiftSwap(sf.id)}
                          className="flex-1 sm:flex-none px-4 py-1.5 bg-slate-950 hover:bg-rose-900/20 hover:text-rose-400 border border-slate-850 rounded-xl text-xs font-bold"
                        >
                          Reject Swap
                        </button>
                        <button
                          onClick={() => onApproveShiftSwap(sf.id)}
                          className="flex-1 sm:flex-none px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                        >
                          Confirm swap
                        </button>
                      </div>
                    </div>
                  ))}

                  {pendingShifts.length === 0 && (
                    <p className="text-center py-4 text-slate-500 text-xs">No pending shift swaps.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 8: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Global System Configurations</h2>
                <p className="text-xs text-slate-400">Fine-tune thermal thresholds, 3D face sensitivity, and GPS accuracy envelopes.</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2 text-left">
                  <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider">Facial Recognition Threshold</label>
                  <input
                    type="range"
                    min="85"
                    max="99"
                    value={localLiveness}
                    onChange={(e) => setLocalLiveness(parseInt(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>Standard (85%)</span>
                    <span className="text-indigo-400 font-bold">{localLiveness}% match</span>
                    <span>Strict (99%)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    A higher threshold enforces severe landmark vector matching. May require perfect campus lighting.
                  </p>
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider">GPS Deviation Radius (Meters)</label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={localGpsTolerance}
                    onChange={(e) => setLocalGpsTolerance(parseInt(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>Tight (5m)</span>
                    <span className="text-indigo-400 font-bold">±{localGpsTolerance}m limit</span>
                    <span>Wide (100m)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Specifies the permissible discrepancy before standard checks reject auto-clock-in.
                  </p>
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider">WiFi Match Enforcement Rules</label>
                  <select
                    value={localWifiEnforce}
                    onChange={(e) => setLocalWifiEnforce(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs p-2.5 rounded-xl text-white focus:outline-none"
                  >
                    <option value="None">Allow any cellular/unlocked WiFi SSID</option>
                    <option value="Warn Mismatch">Flag network SSID mismatches but permit punch-in</option>
                    <option value="Strict Enforce">Block and lock biometric punch-ins entirely if mismatched</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Enforces hardware locking: checks if employee device SSID strictly matches zone whitelist.
                  </p>
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider">Security Enforcement Mode</label>
                  <select
                    value={localSecurityLvl}
                    onChange={(e) => setLocalSecurityLvl(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs p-2.5 rounded-xl text-white focus:outline-none"
                  >
                    <option value="Standard">Standard Mode (Manual Overrides allowed)</option>
                    <option value="High (Face + GPS + WiFi)">High Mode (Multiple factor authentication)</option>
                    <option value="Maximum (Instant Lockout)">Maximum Security (Instant lockout on failure)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Strictness rule: Maximum mode sends immediate push alerts to security on geofence violations.
                  </p>
                </div>

              </div>

              <div className="pt-6 border-t border-slate-900 flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/15"
                >
                  Save Global Enforcements
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
};
