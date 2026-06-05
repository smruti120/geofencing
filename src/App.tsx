import { useState, useEffect } from 'react';
import { 
  MOCK_EMPLOYEES, MOCK_ATTENDANCE_LOGS, MOCK_GATE_PASSES, MOCK_LEAVES, MOCK_SHIFTS, 
  MOCK_NOTIFICATIONS, MOCK_GEOFENCES, INITIAL_SETTINGS, MOCK_STUDENTS, MOCK_VENDORS, MOCK_MATERIAL_PASSES
} from './data';
import { 
  Employee, AttendanceLog, GatePass, LeaveRequest, Shift, GeofenceZone, SystemSettings, Notification, SystemRole, Student, Vendor, MaterialGatePass
} from './types';
import { EmployeePortal } from './components/EmployeePortal';
import { AdminPortal } from './components/AdminPortal';
import { StudentPortal } from './components/StudentPortal';
import { VendorPortal } from './components/VendorPortal';
import { MaterialGatePassModule } from './components/MaterialGatePassModule';
import { HODApproverDashboard } from './components/HODApproverDashboard';
import { SecurityDashboard } from './components/SecurityDashboard';
import { EventModule } from './components/EventModule';
import { LoginPage } from './components/LoginPage';
import { InteractiveMap, getDistanceInMeters } from './components/InteractiveMap';
import { 
  Radio, CheckCircle2, Cpu, LogOut
} from 'lucide-react';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loggedInUser, setLoggedInUser] = useState<{ role: SystemRole; userId: string; name: string } | null>(null);

  // Unified global states
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [students] = useState<Student[]>(MOCK_STUDENTS);
  const [vendors, setVendors] = useState<Vendor[]>(MOCK_VENDORS);
  const [materialPasses, setMaterialPasses] = useState<MaterialGatePass[]>(MOCK_MATERIAL_PASSES);
  const [logs, setLogs] = useState<AttendanceLog[]>(MOCK_ATTENDANCE_LOGS);
  const [gatePasses, setGatePasses] = useState<GatePass[]>(MOCK_GATE_PASSES);
  const [leaves, setLeaves] = useState<LeaveRequest[]>(MOCK_LEAVES);
  const [shifts, setShifts] = useState<Shift[]>(MOCK_SHIFTS);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [geofences, setGeofences] = useState<GeofenceZone[]>(MOCK_GEOFENCES);

  // Active Role Selection (Level 1 Users Layer)
  const [currentRole, setCurrentRole] = useState<SystemRole>('Staff');
  // Active Employee Presets
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>('EMP-2026-09'); // Alex Rivera (CS) by default
  const [currentStudentId, setCurrentStudentId] = useState<string>('STU-2026-01');

  // Simulated physical device telemetry
  const [currentLat, setCurrentLat] = useState<number>(37.4280); // Inside Science Block
  const [currentLng, setCurrentLng] = useState<number>(-122.1700);
  const [currentWifiSSID, setCurrentWifiSSID] = useState<string>('CAMPUS_SECURE_5G');
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(4.2); // in meters
  const [showSandboxControls, setShowSandboxControls] = useState<boolean>(false);

  // Action feedback toasts
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'danger' } | null>(null);

  const triggerToast = (text: string, type: 'info' | 'success' | 'danger' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Default employee for when no employees exist yet (production fresh start)
  const defaultEmployee: Employee = {
    id: 'EMP-DEFAULT',
    name: 'System Administrator',
    role: 'Administrator',
    department: 'IT',
    email: 'admin@campus.edu',
    phone: '+1-000-000-0000',
    avatarUrl: 'https://ui-avatars.com/api/?name=System+Admin&background=6366f1&color=fff',
    rfidCardNumber: 'RFID-DEFAULT',
    macAddress: '00:00:00:00:00:00',
    allowedWifiSSID: 'CAMPUS_SECURE_5G',
    gpsCoords: { lat: 37.4275, lng: -122.1697 },
    faceRegistered: true,
    livenessRegisteredAt: new Date().toISOString(),
    reportingManager: 'None',
    assignedSystemRole: 'Admin'
  };

  const activeEmployee = employees.find(e => e.id === currentEmployeeId) || employees[0] || defaultEmployee;

  // Automatically calculate which zone the simulated device resides inside
  const [activeZone, setActiveZone] = useState<GeofenceZone | null>(null);

  useEffect(() => {
    let matchedZone: GeofenceZone | null = null;
    for (const zone of geofences) {
      const distance = getDistanceInMeters(currentLat, currentLng, zone.latitude, zone.longitude);
      if (distance <= zone.radius) {
        matchedZone = zone;
        break;
      }
    }
    setActiveZone(matchedZone);
  }, [currentLat, currentLng, geofences]);

  // Trigger automated alerts if a user acts outside geofence and strict policies are on
  useEffect(() => {
    if (!activeZone && settings.securityLevel.includes('Maximum') && currentRole === 'Staff') {
      const isCheckInDay = logs.some(l => l.employeeId === activeEmployee.id && l.timestamp.includes('Today'));
      if (isCheckInDay) {
        triggerToast(`Security Breach Alert: Employee ${activeEmployee.name} left authorized geofence without Gate Pass check-out!`, 'danger');
      }
    }
  }, [activeZone, currentRole, settings.securityLevel, activeEmployee, logs]);

  // handlePersonaChange removed — persona switching disabled in production

  // Employee addition operations
  const handleAddEmployee = (newEmp: Employee) => {
    setEmployees(prev => [...prev, newEmp]);
    triggerToast(`Employee '${newEmp.name}' successfully created with role '${newEmp.assignedSystemRole}'.`, 'success');
  };

  const handleBulkAddEmployees = (newEmps: Employee[]) => {
    setEmployees(prev => [...prev, ...newEmps]);
    triggerToast(`Successfully bulk-imported ${newEmps.length} employees to roster.`, 'success');
  };

  // Attendance log operations
  const handleAddLog = (newLog: AttendanceLog) => {
    setLogs(prev => [newLog, ...prev]);
    triggerToast(`Biometric punch-in registered successfully. Status: ${newLog.status}!`, 'success');
  };

  // Gate Pass operations
  const handleAddGatePass = (newPass: GatePass) => {
    setGatePasses(prev => [newPass, ...prev]);
    triggerToast(`Gate Pass filed for ${newPass.reason} • Forwarded to Admin Approval Queue.`, 'info');
  };

  const handleUpdateGatePass = (passId: string, status: 'Active Out' | 'Returned') => {
    setGatePasses(prev => prev.map(pass => {
      if (pass.id === passId) {
        const now = new Date();
        if (status === 'Active Out') {
          return {
            ...pass,
            status: 'Active Out',
            outTime: now.toLocaleTimeString(),
            expiryTime: new Date(Date.now() + pass.validDurationHours * 60 * 60 * 1000).toISOString()
          };
        } else if (status === 'Returned') {
          return {
            ...pass,
            status: 'Returned',
            inTime: now.toLocaleTimeString()
          };
        }
      }
      return pass;
    }));
    triggerToast(`Gate Pass status updated to: ${status === 'Active Out' ? 'Departed Campus' : 'Returned to Campus'}.`, 'success');
  };

  // Leaves operations
  const handleAddLeave = (newLeave: LeaveRequest) => {
    setLeaves(prev => [newLeave, ...prev]);
    triggerToast(`Leave application filed successfully.`, 'success');
  };

  // Notifications operations
  const handleAddNotification = (notif: Notification) => {
    setNotifications(prev => [notif, ...prev]);
  };

  const handleUpdateNotification = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Admin Approvals Desk operations
  const handleApproveGatePass = (passId: string, durationHours?: number) => {
    setGatePasses(prev => prev.map(pass => {
      if (pass.id === passId) {
        const activeDuration = durationHours || pass.validDurationHours;
        return {
          ...pass,
          status: 'Approved',
          validDurationHours: activeDuration,
          authorizedBy: 'Marcus Vance (HR Admin)',
          approveTime: new Date().toLocaleTimeString()
        };
      }
      return pass;
    }));
    
    const targetPass = gatePasses.find(p => p.id === passId);
    if (targetPass) {
      const newNotif: Notification = {
        id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
        recipientId: targetPass.employeeId,
        title: 'Gate Pass Approved',
        message: `Your Gate Pass exit clearance (Duration: ${targetPass.validDurationHours}h) has been approved. Scan at exit gateway.`,
        type: 'success',
        timestamp: 'Just now',
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
    }
    
    triggerToast(`Gate Pass exit cleared.`, 'success');
  };

  const handleRejectGatePass = (passId: string) => {
    setGatePasses(prev => prev.map(pass => pass.id === passId ? { ...pass, status: 'Rejected' } : pass));
    
    const targetPass = gatePasses.find(p => p.id === passId);
    if (targetPass) {
      const newNotif: Notification = {
        id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
        recipientId: targetPass.employeeId,
        title: 'Gate Pass Rejected',
        message: `Your Gate Pass request was rejected by Campus Operations Hub.`,
        type: 'danger',
        timestamp: 'Just now',
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
    }

    triggerToast(`Gate Pass exit request denied.`, 'info');
  };

  const handleApproveLeave = (leaveId: string, notes?: string) => {
    setLeaves(prev => prev.map(lv => lv.id === leaveId ? { ...lv, status: 'Approved', approverNotes: notes } : lv));
    
    const targetLeave = leaves.find(l => l.id === leaveId);
    if (targetLeave) {
      const newNotif: Notification = {
        id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
        recipientId: targetLeave.employeeId,
        title: 'Leave Request Approved',
        message: `Your application for ${targetLeave.type} starting ${targetLeave.startDate} is approved.`,
        type: 'success',
        timestamp: 'Just now',
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
    }

    triggerToast(`Leave approved.`, 'success');
  };

  const handleRejectLeave = (leaveId: string, notes?: string) => {
    setLeaves(prev => prev.map(lv => lv.id === leaveId ? { ...lv, status: 'Rejected', approverNotes: notes } : lv));
    
    const targetLeave = leaves.find(l => l.id === leaveId);
    if (targetLeave) {
      const newNotif: Notification = {
        id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
        recipientId: targetLeave.employeeId,
        title: 'Leave Request Rejected',
        message: `Your leave application starting ${targetLeave.startDate} was declined.`,
        type: 'danger',
        timestamp: 'Just now',
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
    }

    triggerToast(`Leave declined.`, 'info');
  };

  const handleApproveShiftSwap = (shiftId: string) => {
    setShifts(prev => prev.map(sf => {
      if (sf.id === shiftId && sf.swapRequest) {
        return {
          ...sf,
          swapRequest: {
            ...sf.swapRequest,
            status: 'Approved'
          }
        };
      }
      return sf;
    }));

    const targetShift = shifts.find(s => s.id === shiftId);
    if (targetShift && targetShift.swapRequest) {
      const newNotif: Notification = {
        id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
        recipientId: targetShift.employeeId,
        title: 'Shift Swap Approved',
        message: `Your shift exchange request for night vigil duty with ${targetShift.swapRequest.swapWithEmployeeName} has been cleared.`,
        type: 'success',
        timestamp: 'Just now',
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
    }

    triggerToast(`Shift swap proposal authorized.`, 'success');
  };

  const handleRejectShiftSwap = (shiftId: string) => {
    setShifts(prev => prev.map(sf => {
      if (sf.id === shiftId && sf.swapRequest) {
        return {
          ...sf,
          swapRequest: {
            ...sf.swapRequest,
            status: 'Rejected'
          }
        };
      }
      return sf;
    }));
    triggerToast(`Shift swap proposal rejected.`, 'info');
  };

  // Geofence CRUD
  const handleAddGeofence = (zone: GeofenceZone) => {
    setGeofences(prev => [...prev, zone]);
    triggerToast(`New campus geofence '${zone.name}' successfully established.`, 'success');
  };

  const handleDeleteGeofence = (zoneId: string) => {
    setGeofences(prev => prev.filter(z => z.id !== zoneId));
    triggerToast(`Campus geofence dismantled.`, 'info');
  };

  // Reports Generation Mock
  const handleTriggerReportDownload = (type: 'csv' | 'pdf') => {
    triggerToast(`Generating biometric audit report. Download starts in a moment...`, 'info');
    setTimeout(() => {
      triggerToast(`SUCCESS: Report spreadsheet downloaded as '${activeEmployee.department}_CampusAudit_${new Date().toISOString().split('T')[0]}.${type}'`, 'success');
    }, 1800);
  };

  // Settings update
  const handleUpdateSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    triggerToast(`Global strictness guidelines updated.`, 'success');
  };

  // Handle login — role is locked to what the server assigned; no client-side override
  const handleLogin = (role: SystemRole, userId: string, userName: string) => {
    setIsAuthenticated(true);
    setLoggedInUser({ role, userId, name: userName });
    setCurrentRole(role);
    if (role === 'Student') {
      setCurrentStudentId(userId);
    } else {
      setCurrentEmployeeId(userId);
    }
    triggerToast(`Welcome ${userName}! Logged in as ${role}`, 'success');
  };

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoggedInUser(null);
    triggerToast('Logged out successfully', 'info');
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased flex flex-col">
      
      {/* Global Header / Control Bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo & Portal Context */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center shadow-inner">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                <span>OmniGuard Campus Security Hub</span>
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                  QR + Geofencing
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">
                Biometrics, 3D Liveness Verification & Gate Pass Departure Lock
              </p>
            </div>
          </div>

          {/* Locked Role Badge — switching is not permitted in production */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-400 font-medium">{loggedInUser?.name || 'User'}</span>
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                {currentRole}
              </span>
            </div>

            <button
              onClick={() => setShowSandboxControls(!showSandboxControls)}
              className={`p-1.5 rounded-xl border text-[10.5px] font-bold transition-all flex items-center gap-1.5 ${
                showSandboxControls ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Sensors
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[10.5px] font-bold transition-all flex items-center gap-1.5 hover:bg-rose-500/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>

        </div>
      </header>

      {/* Global Alert Toast notifications */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className={`px-4 py-3.5 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-semibold ${
            toastMessage.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/20 text-emerald-400' :
            toastMessage.type === 'danger' ? 'bg-red-950/95 border-red-500/30 text-red-400 animate-bounce' :
            'bg-slate-900/90 border-slate-800 text-indigo-400'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main App Content Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full flex flex-col gap-6">
        
        {/* Split layout: Main Portal view vs Sandbox Telemetry Controls */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          
          {/* Left 2-Columns: Renders the active portal based on Level 1 User Role */}
          <div className="xl:col-span-2 space-y-6 min-w-0">
            {currentRole === 'Staff' && (
              <EmployeePortal
                employee={activeEmployee}
                employees={employees}
                logs={logs}
                gatePasses={gatePasses}
                leaves={leaves}
                shifts={shifts}
                notifications={notifications}
                settings={settings}
                activeZone={activeZone}
                currentLat={currentLat}
                currentLng={currentLng}
                currentWifiSSID={currentWifiSSID}
                gpsAccuracy={gpsAccuracy}
                onAddLog={handleAddLog}
                onAddGatePass={handleAddGatePass}
                onAddLeave={handleAddLeave}
                onAddNotification={handleAddNotification}
                onUpdateGatePass={handleUpdateGatePass}
                onUpdateShiftSwap={handleApproveShiftSwap}
                onUpdateNotification={handleUpdateNotification}
              />
            )}
            {currentRole === 'Admin' && (
              <AdminPortal
                employees={employees}
                logs={logs}
                gatePasses={gatePasses}
                leaves={leaves}
                shifts={shifts}
                settings={settings}
                geofences={geofences}
                onUpdateSettings={handleUpdateSettings}
                onApproveGatePass={handleApproveGatePass}
                onRejectGatePass={handleRejectGatePass}
                onApproveLeave={handleApproveLeave}
                onRejectLeave={handleRejectLeave}
                onApproveShiftSwap={handleApproveShiftSwap}
                onRejectShiftSwap={handleRejectShiftSwap}
                onAddGeofence={handleAddGeofence}
                onDeleteGeofence={handleDeleteGeofence}
                onAddNotification={handleAddNotification}
                onTriggerReportDownload={handleTriggerReportDownload}
                onAddEmployee={handleAddEmployee}
                onBulkAddEmployees={handleBulkAddEmployees}
              />
            )}
            {currentRole === 'Student' && (
              <StudentPortal student={students.find(s => s.id === currentStudentId) || students[0]} />
            )}
            {currentRole === 'Vendor' && (
              <VendorPortal vendors={vendors} onStatusChange={(id, status) => setVendors(prev => prev.map(v => v.id === id ? {...v, status} : v))} />
            )}
            {currentRole === 'HOD' && (
              <HODApproverDashboard
                pendingGatePasses={gatePasses.filter(p => p.status === 'Pending')}
                pendingLeaves={leaves.filter(l => l.status === 'Pending')}
                pendingMaterialPasses={materialPasses.filter(m => m.status === 'Pending')}
                pendingVendors={vendors.filter(v => v.status === 'Pending')}
                onApproveGatePass={handleApproveGatePass}
                onRejectGatePass={handleRejectGatePass}
                onApproveLeave={handleApproveLeave}
                onRejectLeave={handleRejectLeave}
                onApproveMaterialPass={(id) => setMaterialPasses(prev => prev.map(m => m.id === id ? {...m, status: 'Approved', approvedBy: activeEmployee.name} : m))}
                onRejectMaterialPass={(id) => setMaterialPasses(prev => prev.map(m => m.id === id ? {...m, status: 'Rejected'} : m))}
                onApproveVendor={(id) => setVendors(prev => prev.map(v => v.id === id ? {...v, status: 'Approved'} : v))}
                onRejectVendor={(id) => setVendors(prev => prev.map(v => v.id === id ? {...v, status: 'Rejected'} : v))}
              />
            )}
            {currentRole === 'Security' && (
              <SecurityDashboard logs={logs} gatePasses={gatePasses} vendors={vendors} />
            )}
            {currentRole === 'HR' && (
              <AdminPortal
                employees={employees}
                logs={logs}
                gatePasses={gatePasses}
                leaves={leaves}
                shifts={shifts}
                settings={settings}
                geofences={geofences}
                onUpdateSettings={handleUpdateSettings}
                onApproveGatePass={handleApproveGatePass}
                onRejectGatePass={handleRejectGatePass}
                onApproveLeave={handleApproveLeave}
                onRejectLeave={handleRejectLeave}
                onApproveShiftSwap={handleApproveShiftSwap}
                onRejectShiftSwap={handleRejectShiftSwap}
                onAddGeofence={handleAddGeofence}
                onDeleteGeofence={handleDeleteGeofence}
                onAddNotification={handleAddNotification}
                onTriggerReportDownload={handleTriggerReportDownload}
                onAddEmployee={handleAddEmployee}
                onBulkAddEmployees={handleBulkAddEmployees}
              />
            )}
            {/* Material Gate Pass Module (Accessible by Admin/HR/Security/HOD) */}
            {(currentRole === 'Admin' || currentRole === 'HR' || currentRole === 'Security' || currentRole === 'HOD') && (
              <div className="mt-6">
                <MaterialGatePassModule 
                  materialPasses={materialPasses} 
                  onApprove={(id) => setMaterialPasses(prev => prev.map(m => m.id === id ? {...m, status: 'Approved'} : m))} 
                />
              </div>
            )}
            
            {/* Event Management Module (Accessible by Admin/HR/Staff) */}
            {(currentRole === 'Admin' || currentRole === 'HR' || currentRole === 'Staff') && (
              <div className="mt-6">
                <EventModule isAdmin={currentRole !== 'Staff'} />
              </div>
            )}
          </div>

          {/* Right 1-Column: Interactive Map and Environment controls */}
          {showSandboxControls && (
            <div className="space-y-6">
              
              {/* Sandbox Hardware Telemetry controller panel */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 text-left">
                
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-200">
                      Sandbox Telemetry Sensors
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-bold rounded uppercase">
                    Simulation Mode
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-normal">
                  Configure hardware sensors manually to test GPS accuracy violations, face liveness rejections, or authorized WiFi networks whitelists.
                </p>

                {/* Wifi SSID sensor */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                    <span>Connected Campus WiFi SSID</span>
                    <span className="text-indigo-400 font-mono">{currentWifiSSID}</span>
                  </div>
                  
                  <select
                    value={currentWifiSSID}
                    onChange={(e) => {
                      setCurrentWifiSSID(e.target.value);
                      triggerToast(`WiFi connection changed to "${e.target.value}"`, 'info');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="CAMPUS_SECURE_5G">CAMPUS_SECURE_5G (Whitelisted CS/Admin/Library)</option>
                    <option value="SCIENCE_HIGH_SPEED">SCIENCE_HIGH_SPEED (Whitelisted Science Labs)</option>
                    <option value="LIBRARY_FREE_WIFI">LIBRARY_FREE_WIFI (Whitelisted Library Quad)</option>
                    <option value="ADMIN_WIFI">ADMIN_WIFI (Whitelisted Admin Building)</option>
                    <option value="UNSECURED_CELLULAR_NET">UNSECURED_CELLULAR_NET (Will report warning!)</option>
                    <option value="OFF_CAMPUS_COFFEE_GUEST">OFF_CAMPUS_COFFEE_GUEST (Lockout warning!)</option>
                  </select>
                </div>

                {/* GPS Accuracy slider */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                    <span>GPS Accuracy Precision</span>
                    <span className="text-indigo-400 font-mono font-bold">±{gpsAccuracy.toFixed(1)} meters</span>
                  </div>

                  <input
                    type="range"
                    min="1.5"
                    max="25"
                    step="0.5"
                    value={gpsAccuracy}
                    onChange={(e) => setGpsAccuracy(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>Military Precision (1.5m)</span>
                    <span>Drifting (25.0m)</span>
                  </div>
                </div>

                {/* Visual Diagnostics Panel */}
                <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-3 space-y-2 font-mono text-[10px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Closest Geofenced Sector:</span>
                    <span className="text-slate-200 font-semibold font-sans">
                      {activeZone ? activeZone.name : 'Out of campus boundary'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Allowed Whitelist SSID:</span>
                    <span className="text-emerald-400 text-right max-w-[160px] truncate">
                      {activeZone ? activeZone.allowedWifiSSID.join(', ') : 'None (Off-campus)'}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-slate-900 pt-2 mt-2 text-[11px]">
                    <span>CHECK-IN CAPABILITY:</span>
                    <span className={`font-extrabold ${
                      activeZone && activeZone.allowedWifiSSID.includes(currentWifiSSID)
                        ? 'text-emerald-400 animate-pulse'
                        : 'text-amber-500'
                    }`}>
                      {activeZone && activeZone.allowedWifiSSID.includes(currentWifiSSID)
                        ? 'READY (Secure)'
                        : 'LOCKED (SSID Mismatch / Coords drift)'}
                    </span>
                  </div>
                </div>

              </div>

              {/* Interactive Geofencing Map Box */}
              <div className="h-[480px]">
                <InteractiveMap
                  currentLat={currentLat}
                  currentLng={currentLng}
                  onLocationChange={(lat, lng) => {
                    setCurrentLat(lat);
                    setCurrentLng(lng);
                  }}
                  gpsAccuracy={gpsAccuracy}
                  activeZone={activeZone}
                />
              </div>

            </div>
          )}

        </div>

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 mt-auto text-slate-500 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>© 2026 OmniGuard security Inc. All campus biometrics and facial registers are encrypted under RSA-2048.</p>
          <p className="text-[10px]">
            Enforcing Face + Liveness (blink & expression check), WiFi MAC & SSID validation, and Localized GPS coordinate proximity grids.
          </p>
        </div>
      </footer>

    </div>
  );
}
