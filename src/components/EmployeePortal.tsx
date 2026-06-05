import React, { useState, useEffect } from 'react';
import { 
  Employee, AttendanceLog, GatePass, LeaveRequest, Shift, GeofenceZone, SystemSettings, Notification 
} from '../types';
import { 
  Clock, MapPin, Wifi, ShieldCheck, ShieldAlert, AlertTriangle, Calendar, FileText, 
  Bell, User, Eye, RefreshCw, CheckCircle, Lock, QrCode, ArrowUpRight
} from 'lucide-react';
import { LivenessScanner } from './LivenessScanner';

interface EmployeePortalProps {
  employee: Employee;
  employees: Employee[];
  logs: AttendanceLog[];
  gatePasses: GatePass[];
  leaves: LeaveRequest[];
  shifts: Shift[];
  notifications: Notification[];
  settings: SystemSettings;
  activeZone: GeofenceZone | null;
  currentLat: number;
  currentLng: number;
  currentWifiSSID: string;
  gpsAccuracy: number;
  onAddLog: (log: AttendanceLog) => void;
  onAddGatePass: (pass: GatePass) => void;
  onAddLeave: (leave: LeaveRequest) => void;
  onAddNotification: (notif: Notification) => void;
  onUpdateGatePass: (passId: string, status: 'Active Out' | 'Returned') => void;
  onUpdateShiftSwap: (shiftId: string, swapStatus: 'Pending' | 'Approved' | 'Rejected') => void;
  onUpdateNotification: (id: string) => void;
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({
  employee,
  employees,
  logs,
  gatePasses,
  leaves,
  shifts,
  notifications,
  settings,
  activeZone,
  currentLat,
  currentLng,
  currentWifiSSID,
  gpsAccuracy,
  onAddLog,
  onAddGatePass,
  onAddLeave,
  onAddNotification,
  onUpdateGatePass,
  onUpdateShiftSwap,
  onUpdateNotification
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'attendance' | 'gatepass' | 'leaves' | 'shift' | 'notifications' | 'profile'>('home');
  const [isPunchingIn, setIsPunchingIn] = useState(false);
  const [punchStep, setPunchStep] = useState<'verify' | 'liveness' | 'success'>('verify');
  const [gpsVerified, setGpsVerified] = useState(false);
  const [wifiVerified, setWifiVerified] = useState(false);
  const [showIDCardBack, setShowIDCardBack] = useState(false);
  const [livenessScoreResult, setLivenessScoreResult] = useState<number>(0);
  const [punchError, setPunchError] = useState<string | null>(null);
  
  // Additional requested fields
  const [selectedOfficeSite, setSelectedOfficeSite] = useState<string>('ZONE-01');
  const [isWfhMode, setIsWfhMode] = useState<boolean>(false);

  // Leave request form state
  const [leaveType, setLeaveType] = useState<'Casual Leave' | 'Sick Leave' | 'Earned Leave' | 'Duty Leave' | 'Short Leave' | 'Outdoor Duty'>('Casual Leave');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitted, setLeaveSubmitted] = useState(false);

  // Gate pass request state
  const [showGatePassForm, setShowGatePassForm] = useState(false);
  const [passReason, setPassReason] = useState<'Official Duty' | 'Medical Emergency' | 'Personal Leave' | 'Lunch Break' | 'Client Meeting'>('Lunch Break');
  const [passType, setPassType] = useState<'Out & Back' | 'One Way'>('Out & Back');
  const [passDuration, setPassDuration] = useState<number>(2);
  const [passError, setPassError] = useState<string | null>(null);

  // Shift swap state
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedSwapShift, setSelectedSwapShift] = useState<Shift | null>(null);
  const [targetCoworkerId, setTargetCoworkerId] = useState('');

  // Timer for active out gate passes
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Today's attendance log for this employee
  const todayLog = logs.find(log => {
    const isToday = log.timestamp.includes('2026-02-25') || new Date(log.timestamp).toDateString() === new Date().toDateString();
    return log.employeeId === employee.id && isToday && log.status !== 'Gate Pass Out';
  });

  const activeOutPass = gatePasses.find(pass => 
    pass.employeeId === employee.id && 
    (pass.status === 'Active Out' || pass.status === 'Approved')
  );

  // Auto-verify GPS & WiFi on component load or coordinate shifts
  useEffect(() => {
    setGpsVerified(!!activeZone);
    setWifiVerified(activeZone ? activeZone.allowedWifiSSID.includes(currentWifiSSID) : false);
  }, [activeZone, currentWifiSSID]);

  const handleStartPunchIn = () => {
    // Reset states
    setPunchError(null);
    setPunchStep('verify');
    setIsPunchingIn(true);

    // Verify location and WiFi (Relaxed if WFH is toggled)
    const locationOk = isWfhMode ? true : !!activeZone;
    const wifiOk = isWfhMode ? true : (activeZone ? activeZone.allowedWifiSSID.includes(currentWifiSSID) : false);

    setGpsVerified(locationOk);
    setWifiVerified(wifiOk);

    setTimeout(() => {
      if (!locationOk && settings.securityLevel.includes('Maximum') && !isWfhMode) {
        setPunchError('GPS Out-of-bounds: Maximum security locks out off-campus check-ins.');
      } else if (settings.wifiEnforcement === 'Strict Enforce' && !wifiOk && !isWfhMode) {
        setPunchError('WiFi Security Violation: Connection to authorized campus network SSID is strictly required.');
      } else {
        // Proceed to biometric scan step after visual delay
        setTimeout(() => {
          setPunchStep('liveness');
        }, 1200);
      }
    }, 1000);
  };

  const handleLivenessSuccess = (selfieUrl: string, score: number) => {
    setLivenessScoreResult(score);
    setPunchStep('success');

    // Determine Status
    let statusVerdict: 'Present' | 'Late' | 'Flagged' = 'Present';
    const nowHours = new Date().getHours();
    if (nowHours >= 9 && nowHours < 17) {
      statusVerdict = 'Late';
    }

    // Determine if wifi mismatch should flag
    if (!wifiVerified && settings.wifiEnforcement === 'Strict Enforce') {
      statusVerdict = 'Flagged';
    }

    // Add new log to state
    const newLog: AttendanceLog = {
      id: `LOG-${Math.floor(10000 + Math.random() * 90000)}`,
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      timestamp: new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' Today',
      photoUrl: selfieUrl,
      livenessScore: score,
      gpsCoords: { lat: currentLat, lng: currentLng },
      gpsAccuracy: gpsAccuracy,
      gpsStatus: activeZone ? 'Exact' : 'Out of Bounds',
      ssidMatched: currentWifiSSID,
      wifiStatus: wifiVerified ? 'Secure WiFi' : 'Mismatch',
      method: 'Face ID',
      status: statusVerdict
    };

    onAddLog(newLog);

    // Trigger notifications
    const newNotif: Notification = {
      id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
      recipientId: employee.id,
      title: 'Attendance Clock-In Successful',
      message: `Face + Liveness verification verified at ${activeZone?.name || 'Unknown'}. Status: ${statusVerdict}`,
      type: statusVerdict === 'Flagged' ? 'warning' : 'success',
      timestamp: 'Just now',
      read: false
    };
    onAddNotification(newNotif);
  };

  const handleLivenessFailure = (reason: string) => {
    setPunchError(reason);
    setPunchStep('verify');

    const newNotif: Notification = {
      id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
      recipientId: 'admin',
      title: `Spoof Attempt Blocked`,
      message: `Facial verification failed for ${employee.name}: ${reason}`,
      type: 'danger',
      timestamp: 'Just now',
      read: false
    };
    onAddNotification(newNotif);
  };

  const handleRequestGatePass = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);

    if (activeOutPass) {
      setPassError('You already have a pending or active gate pass.');
      return;
    }

    const newPass: GatePass = {
      id: `PASS-2026-${Math.floor(100 + Math.random() * 900)}`,
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      reason: passReason,
      type: passType,
      status: 'Pending',
      requestTime: new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' Today',
      validDurationHours: passDuration,
      qrCodeVal: `GATEPASS_${employee.name.toUpperCase().replace(' ', '_')}_${Math.floor(Math.random() * 99999)}`
    };

    onAddGatePass(newPass);
    setShowGatePassForm(false);

    const newNotif: Notification = {
      id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
      recipientId: 'admin',
      title: 'New Gate Pass Request',
      message: `${employee.name} requested a gate pass for ${passReason} (${passDuration} hours).`,
      type: 'warning',
      timestamp: 'Just now',
      read: false
    };
    onAddNotification(newNotif);
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd || !leaveReason) return;

    const start = new Date(leaveStart);
    const end = new Date(leaveEnd);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newLeave: LeaveRequest = {
      id: `LV-${Math.floor(800 + Math.random() * 200)}`,
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      type: leaveType,
      startDate: leaveStart,
      endDate: leaveEnd,
      totalDays: diffDays,
      reason: leaveReason,
      status: 'Pending',
      requestDate: new Date().toISOString().split('T')[0]
    };

    onAddLeave(newLeave);
    setLeaveSubmitted(true);
    setLeaveStart('');
    setLeaveEnd('');
    setLeaveReason('');

    const newNotif: Notification = {
      id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
      recipientId: 'admin',
      title: 'New Leave Request',
      message: `${employee.name} requested ${diffDays} days of ${leaveType}.`,
      type: 'info',
      timestamp: 'Just now',
      read: false
    };
    onAddNotification(newNotif);

    setTimeout(() => setLeaveSubmitted(false), 4000);
  };

  const handleSwapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSwapShift || !targetCoworkerId) return;

    const targetCoworker = employees.find(emp => emp.id === targetCoworkerId);
    if (!targetCoworker) return;

    onUpdateShiftSwap(selectedSwapShift.id, 'Pending');
    // Add details simulated in UI
    setShowSwapModal(false);

    const newNotif: Notification = {
      id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
      recipientId: 'admin',
      title: 'Shift Swap Requested',
      message: `${employee.name} requested to swap shift with ${targetCoworker.name}.`,
      type: 'info',
      timestamp: 'Just now',
      read: false
    };
    onAddNotification(newNotif);
  };

  // Filter relevant lists
  const employeeLogs = logs.filter(log => log.employeeId === employee.id);
  const employeeLeaves = leaves.filter(lv => lv.employeeId === employee.id);
  const employeeShifts = shifts.filter(sf => sf.employeeId === employee.id);
  const employeeNotifs = notifications.filter(n => n.recipientId === employee.id || n.recipientId === 'all');

  // Calculate leave balance
  const initialBalance = { casual: 12, sick: 10, earned: 20 };
  const approvedLeavesCount = employeeLeaves
    .filter(l => l.status === 'Approved')
    .reduce((acc, cur) => {
      if (cur.type === 'Casual Leave') acc.casual += cur.totalDays;
      if (cur.type === 'Sick Leave') acc.sick += cur.totalDays;
      if (cur.type === 'Earned Leave') acc.earned += cur.totalDays;
      return acc;
    }, { casual: 0, sick: 0, earned: 0 });

  const currentBalance = {
    casual: initialBalance.casual - approvedLeavesCount.casual,
    sick: initialBalance.sick - approvedLeavesCount.sick,
    earned: initialBalance.earned - approvedLeavesCount.earned
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      
      {/* Sidebar Nav */}
      <div className="lg:w-64 shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-3 p-2 mb-6 border-b border-slate-800 pb-4">
          <img 
            src={employee.avatarUrl} 
            alt={employee.name} 
            className="w-11 h-11 rounded-full border-2 border-indigo-500 object-cover"
          />
          <div className="min-w-0">
            <h4 className="font-bold text-sm truncate">{employee.name}</h4>
            <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider block">Employee Portal</span>
            <span className="text-[10px] text-slate-400 block">{employee.department}</span>
          </div>
        </div>

        <nav className="space-y-1">
          {[
            { id: 'home', label: 'Overview', icon: Clock },
            { id: 'attendance', label: 'Attendance Logs', icon: FileText },
            { id: 'gatepass', label: 'Gate Pass Desk', icon: QrCode },
            { id: 'leaves', label: 'Leaves Tracker', icon: Calendar },
            { id: 'shift', label: 'Shifts & Swaps', icon: RefreshCw },
            { id: 'notifications', label: 'Notifications', icon: Bell, badge: employeeNotifs.filter(n => !n.read).length },
            { id: 'profile', label: 'Smart ID Card', icon: User }
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

        {/* Quick GPS/SSID Hardware Telemetry Widget */}
        <div className="mt-8 bg-slate-950 rounded-xl border border-slate-800 p-3 text-[11px] space-y-2 text-slate-400">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block border-b border-slate-900 pb-1.5">
            Hardware Locks Status
          </span>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span>Zone:</span>
            </div>
            <span className={`font-bold text-[10px] ${activeZone ? 'text-emerald-400' : 'text-amber-500'}`}>
              {activeZone ? activeZone.name : 'Off-Campus'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-slate-500" />
              <span>Campus WiFi:</span>
            </div>
            <span className={`font-mono text-[10px] ${wifiVerified ? 'text-emerald-400' : 'text-amber-500'}`}>
              {wifiVerified ? 'MATCHED' : 'UNMATCHED'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Device Mac:</span>
            </div>
            <span className="font-mono text-[9px] text-slate-300">{employee.macAddress}</span>
          </div>
        </div>

        {/* Simulation Alarm Trigger Triggers */}
        <div className="mt-4 bg-slate-950 rounded-xl border border-slate-800 p-3 text-[11px] space-y-2 text-slate-400">
          <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-400 block border-b border-slate-900 pb-1.5">
            Notification Triggers
          </span>
          
          <button
            onClick={() => {
              onAddNotification({
                id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
                recipientId: employee.id,
                title: '⏰ Check-in Reminder',
                message: 'Shift starts in 10 minutes! Remember to connect towhitelisted WiFi and perform face scan.',
                type: 'warning',
                timestamp: 'Just now',
                read: false
              });
            }}
            className="w-full py-1 bg-slate-900 hover:bg-slate-850 rounded text-[10px] font-bold transition-all text-slate-300 hover:text-white border border-slate-800"
          >
            Fires Check-in Reminder
          </button>

          <button
            onClick={() => {
              onAddNotification({
                id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
                recipientId: employee.id,
                title: '📅 Shift Start Alert',
                message: `General day shift started at 09:00 AM. Geofencing perimeter validation is now active.`,
                type: 'info',
                timestamp: 'Just now',
                read: false
              });
            }}
            className="w-full py-1 bg-slate-900 hover:bg-slate-850 rounded text-[10px] font-bold transition-all text-slate-300 hover:text-white border border-slate-800"
          >
            Fires Shift Start Alert
          </button>
        </div>
      </div>

      {/* Main Content Screen */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white">
        
        {/* TAB 1: HOME / OVERVIEW */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            
            {/* Greeting banner with GPS diagnostics */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-indigo-950/25 border border-indigo-900/40 p-5 rounded-2xl">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-400">Welcome back</span>
                <h2 className="text-xl font-extrabold text-white mt-0.5">Hello, {employee.name}!</h2>
                <p className="text-xs text-slate-400 mt-1">
                  SSID lock: <span className="text-indigo-300 font-mono font-semibold">{currentWifiSSID}</span> • GPS Accuracy: <span className="text-indigo-300 font-mono font-semibold">{gpsAccuracy.toFixed(1)}m</span>
                </p>
              </div>

              {todayLog ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-2.5 text-emerald-400 text-xs font-semibold self-stretch md:self-auto">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <div>
                    <span>Clocked-In Today</span>
                    <span className="block text-[10px] text-emerald-500/80 font-mono">Success • {todayLog.timestamp}</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleStartPunchIn}
                  disabled={isPunchingIn}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-800 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 self-stretch md:self-auto justify-center"
                >
                  <Clock className="w-4 h-4" />
                  {isPunchingIn ? 'Authenticating...' : 'Biometric Geofence Clock-In'}
                </button>
              )}
            </div>

            {/* Active Gate Pass Panel */}
            {activeOutPass ? (
              <div className="bg-amber-950/25 border border-amber-900/40 p-5 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="px-2 py-0.5 bg-amber-400/10 text-amber-400 text-[9px] rounded font-bold border border-amber-400/20 uppercase">
                        Active Gate Pass Out • Approved
                      </span>
                      <h4 className="font-bold text-sm text-white mt-1">Reason: {activeOutPass.reason}</h4>
                      <p className="text-xs text-slate-400">Duration: {activeOutPass.validDurationHours} hrs • Issued by {activeOutPass.authorizedBy || 'Admin'}</p>
                    </div>
                  </div>
                  
                  {activeOutPass.status === 'Active Out' ? (
                    <button 
                      onClick={() => {
                        onUpdateGatePass(activeOutPass.id, 'Returned');
                        const newNotif: Notification = {
                          id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
                          recipientId: 'admin',
                          title: 'Gate Pass Return Checked',
                          message: `${employee.name} returned to campus and checked in.`,
                          type: 'success',
                          timestamp: 'Just now',
                          read: false
                        };
                        onAddNotification(newNotif);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                    >
                      <Clock className="w-4 h-4" />
                      Check Back In
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        onUpdateGatePass(activeOutPass.id, 'Active Out');
                        const newNotif: Notification = {
                          id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
                          recipientId: 'admin',
                          title: 'Campus Departure',
                          message: `${employee.name} has clocked out of main security gate.`,
                          type: 'info',
                          timestamp: 'Just now',
                          read: false
                        };
                        onAddNotification(newNotif);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 animate-pulse"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Depart / Scan Gate QR
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-amber-900/20 pt-4">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Departure QR Gate Lock</span>
                    <div className="my-2 flex justify-center bg-white p-1.5 rounded-lg w-28 h-28 mx-auto">
                      {/* Visual representation of Gate Pass QR code */}
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <rect width="100" height="100" fill="white" />
                        <path d="M10 10h20v20H10zM15 15h10v10H15zM70 10h20v20H70zM75 15h10v10H75zM10 70h20v20H10zM15 75h10v10H15zM40 40h20v20H40zM45 45h10v10H45zM40 10h10v10H40zM50 30h10v10H50zM30 50h10v10H30zM60 70h10v10H60zM70 60h20v10H70zM80 80h10v10H80z" fill="black" />
                      </svg>
                    </div>
                    <span className="text-[9px] font-mono text-center text-slate-400 select-all bg-slate-900 py-1 rounded border border-slate-800/50">
                      {activeOutPass.qrCodeVal}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-3">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Valid Duration Limit</span>
                      <span className="text-sm font-extrabold text-white block mt-1">{activeOutPass.validDurationHours} Hours Out Limit</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Requested At</span>
                      <span className="text-xs text-slate-300 block mt-0.5">{activeOutPass.requestTime}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Authorized Gate Key</span>
                      <span className="text-xs text-amber-400 font-mono block mt-0.5">GEN-2026-KEY-SECURE</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-center items-center text-center">
                    <Clock className="w-7 h-7 text-amber-400 animate-spin-slow mb-1.5" />
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Time Remaining Countdown</span>
                    
                    {activeOutPass.expiryTime ? (
                      <div className="mt-2">
                        <span className="text-lg font-black font-mono text-amber-400 animate-pulse">
                          {Math.max(0, Math.floor((new Date(activeOutPass.expiryTime).getTime() - currentTime.getTime()) / 60000))} mins
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">until strict late citation</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 font-semibold mt-2">Departure pending</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800/60 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
                    <QrCode className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Employee Gate Pass Generator</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Need to step out for lunch, client meetings or personal leave? Generate an authorized pass.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGatePassForm(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-indigo-600 border border-slate-800 hover:border-indigo-500 text-slate-200 hover:text-white font-bold rounded-xl text-xs transition-all active:scale-95 shrink-0 self-stretch md:self-auto text-center"
                >
                  Apply for Gate Pass
                </button>
              </div>
            )}

            {/* Interactive Verification Workflow Modal */}
            {isPunchingIn && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl text-white animate-scale-up">
                  
                  {/* Modal Header */}
                  <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <h3 className="font-extrabold text-sm tracking-wider uppercase text-indigo-400">Biometric & Geofence Lock Sequence</h3>
                    <button 
                      onClick={() => setIsPunchingIn(false)}
                      className="text-slate-400 hover:text-white transition-all text-sm bg-slate-900 hover:bg-slate-800 p-1.5 rounded-lg border border-slate-800"
                    >
                      Cancel Check-In
                    </button>
                  </div>

                  {punchStep === 'verify' && (
                    <div className="p-6 space-y-6">
                      <div className="text-center max-w-md mx-auto space-y-2">
                        <Clock className="w-10 h-10 text-indigo-400 animate-spin-slow mx-auto mb-2" />
                        <h4 className="font-bold text-base">Step 1: Pre-flight Environmental Check</h4>
                        <p className="text-xs text-slate-400">Validating hardware, GPS precision, and WiFi SSID before loading biometric camera scanner.</p>
                      </div>

                      {/* Site Selection & WFH Mode controls */}
                      <div className="max-w-md mx-auto bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <span className="text-[10px] uppercase font-extrabold text-indigo-400 tracking-wider block">Simulate Device Sensor Configuration</span>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Target Campus Site</label>
                            <select
                              value={selectedOfficeSite}
                              onChange={(e) => {
                                setSelectedOfficeSite(e.target.value);
                                // If user picked WFH, toggle WFH. Else select target
                                if (e.target.value === 'WFH') {
                                  setIsWfhMode(true);
                                } else {
                                  setIsWfhMode(false);
                                }
                              }}
                              className="w-full bg-slate-900 border border-slate-850 rounded-lg p-1.5 text-[11px] text-slate-200"
                            >
                              <option value="ZONE-01">Science labs (Zone 1)</option>
                              <option value="ZONE-02">Admin Center (Zone 2)</option>
                              <option value="ZONE-03">Library Quad (Zone 3)</option>
                              <option value="ZONE-04">Security Gate (Zone 4)</option>
                              <option value="WFH">🏠 Work-from-Home Mode</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Assigned Work Shift</label>
                            <select
                              className="w-full bg-slate-900 border border-slate-850 rounded-lg p-1.5 text-[11px] text-slate-200"
                              disabled
                            >
                              <option>Shift-wise: {employeeShifts[0]?.shiftName || 'General Day Shift'}</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input 
                            type="checkbox" 
                            id="wfh_toggle"
                            checked={isWfhMode}
                            onChange={(e) => setIsWfhMode(e.target.checked)}
                            className="rounded accent-indigo-500"
                          />
                          <label htmlFor="wfh_toggle" className="text-[11px] text-slate-300 font-bold cursor-pointer flex items-center gap-1">
                            Relax GPS perimeter (Work-from-home mode)
                          </label>
                        </div>
                      </div>

                      <div className="space-y-3 max-w-md mx-auto">
                        {/* GPS Lock validation */}
                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                          gpsVerified ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                        }`}>
                          <div className="flex items-center gap-2.5">
                            <MapPin className="w-4 h-4" />
                            <div className="text-left">
                              <span className="text-xs font-bold block">GPS Accuracy & Perimeter Check</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {activeZone ? `Match: ${activeZone.name}` : 'Out of Perimeter bounds'}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
                            {gpsVerified ? `±${gpsAccuracy.toFixed(1)}m OK` : 'FAIL'}
                          </span>
                        </div>

                        {/* WiFi lock verification */}
                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                          wifiVerified ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                        }`}>
                          <div className="flex items-center gap-2.5">
                            <Wifi className="w-4 h-4" />
                            <div className="text-left">
                              <span className="text-xs font-bold block">SSID Matching Validation</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Current: "{currentWifiSSID}"
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
                            {wifiVerified ? 'SECURE' : 'MISMATCH'}
                          </span>
                        </div>

                        {/* Fingerprint / Hardware lock validation */}
                        <div className="p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-emerald-400 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Lock className="w-4 h-4" />
                            <div className="text-left">
                              <span className="text-xs font-bold block">Employee Device RFID & MAC Register</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                MAC: {employee.macAddress}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
                            REGISTERED
                          </span>
                        </div>
                      </div>

                      {punchError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2.5 max-w-md mx-auto">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{punchError}</span>
                        </div>
                      )}

                      <div className="text-center pt-2">
                        <span className="text-[10px] text-slate-500">
                          Security Standard Rule: Face Recognition + Anti-Spoof Liveness triggers in 1.5s if parameters lock.
                        </span>
                      </div>
                    </div>
                  )}

                  {punchStep === 'liveness' && (
                    <div className="p-6">
                      <div className="mb-4 text-center">
                        <h4 className="font-bold text-sm">Step 2: 3D Biometric Face Liveness Probe</h4>
                        <p className="text-xs text-slate-400">We enforce facial eye-blink and smile validation to guarantee physical presence.</p>
                      </div>

                      <LivenessScanner
                        onSuccess={handleLivenessSuccess}
                        onFailure={handleLivenessFailure}
                        minThreshold={settings.livenessThreshold}
                      />
                    </div>
                  )}

                  {punchStep === 'success' && (
                    <div className="p-8 text-center space-y-5">
                      <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8 animate-bounce" />
                      </div>

                      <div className="space-y-1 max-w-sm mx-auto">
                        <h4 className="text-lg font-extrabold text-white">Verification Certified!</h4>
                        <p className="text-xs text-slate-400">
                          Successfully validated face liveness ({livenessScoreResult}%), verified perimeter GPS, and secured WiFi check-in.
                        </p>
                      </div>

                      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl inline-block font-mono text-[11px] text-slate-300">
                        Logged at: {new Date().toLocaleTimeString()} Today
                      </div>

                      <div>
                        <button
                          onClick={() => setIsPunchingIn(false)}
                          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all"
                        >
                          Back to Workspace
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gate Pass Application Modal */}
            {showGatePassForm && (
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl text-white animate-scale-up">
                  <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <h3 className="font-extrabold text-sm uppercase text-indigo-400 tracking-wide">Gate Pass Request</h3>
                    <button 
                      onClick={() => setShowGatePassForm(false)}
                      className="text-slate-400 hover:text-white transition-all"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleRequestGatePass} className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Reason for Departure</label>
                      <select
                        value={passReason}
                        onChange={(e) => setPassReason(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Lunch Break">Lunch Break</option>
                        <option value="Client Meeting">Client Meeting</option>
                        <option value="Official Duty">Official Campus Duty</option>
                        <option value="Medical Emergency">Medical Checkup / Emergency</option>
                        <option value="Personal Leave">Personal Urgent Business</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Pass Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPassType('Out & Back')}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${
                            passType === 'Out & Back' 
                              ? 'bg-indigo-600 text-white border border-indigo-500' 
                              : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          Out & Return
                        </button>
                        <button
                          type="button"
                          onClick={() => setPassType('One Way')}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${
                            passType === 'One Way' 
                              ? 'bg-indigo-600 text-white border border-indigo-500' 
                              : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          One-Way Exit
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Estimated Duration Limit (Hours)</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={passDuration}
                        onChange={(e) => setPassDuration(parseInt(e.target.value) || 2)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-[9px] text-slate-500 mt-1 block">Passes exceeding 6 hours trigger direct automatic Dean notification logs.</span>
                    </div>

                    {passError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                        {passError}
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-800 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowGatePassForm(false)}
                        className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-indigo-600/15"
                      >
                        Request Gate Pass
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Visual stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-800/60 p-4 rounded-2xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">This Month</span>
                <h3 className="text-2xl font-black font-mono text-indigo-400">
                  {employeeLogs.filter(l => l.status === 'Present').length + employeeLogs.filter(l => l.status === 'Late').length} Days
                </h3>
                <p className="text-[11px] text-slate-400">Total validated attendance check-ins</p>
              </div>

              <div className="bg-slate-950 border border-slate-800/60 p-4 rounded-2xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Late Check-ins</span>
                <h3 className="text-2xl font-black font-mono text-amber-500">
                  {employeeLogs.filter(l => l.status === 'Late').length}
                </h3>
                <p className="text-[11px] text-slate-400">Arrivals recorded after 09:00 AM</p>
              </div>

              <div className="bg-slate-950 border border-slate-800/60 p-4 rounded-2xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Geofence Alerts</span>
                <h3 className="text-2xl font-black font-mono text-red-500">
                  {employeeLogs.filter(l => l.status === 'Flagged').length}
                </h3>
                <p className="text-[11px] text-slate-400">WiFi SSID discrepancies or GPS drifts</p>
              </div>
            </div>

            {/* Brief Live Timeline of Recent Entries */}
            <div className="bg-slate-950 border border-slate-800/60 rounded-2xl p-5">
              <h3 className="font-bold text-sm mb-4">Today's Telemetry History</h3>
              <div className="space-y-4">
                {employeeLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="flex items-center justify-between bg-slate-900/50 border border-slate-800 p-3 rounded-xl">
                    <div className="flex items-center gap-3">
                      <img src={log.photoUrl} className="w-8 h-8 rounded-full object-cover border border-slate-700" alt="" />
                      <div>
                        <span className="text-xs font-bold block">{log.method} check-in</span>
                        <span className="text-[9px] text-slate-500 font-mono">{log.timestamp} • WiFi SSID: {log.ssidMatched}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                        log.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400' :
                        log.status === 'Late' ? 'bg-amber-500/10 text-amber-400' :
                        log.status === 'Flagged' ? 'bg-red-500/10 text-red-400' :
                        'bg-slate-500/10 text-slate-400'
                      }`}>
                        {log.status}
                      </span>
                      <span className="block text-[8px] text-slate-500 font-mono mt-1">Liveness: {log.livenessScore}%</span>
                    </div>
                  </div>
                ))}

                {employeeLogs.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    No biometric check-ins recorded today. Click "Clock-In" above.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: ATTENDANCE HISTORY */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Biometric Logs & Geofence History</h2>
                <p className="text-xs text-slate-400">Comprehensive audit of all check-ins, WiFi logs, and 3D anti-spoof scores.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-2">Biometric Face</th>
                    <th className="py-3 px-2">Timestamp</th>
                    <th className="py-3 px-2">Method</th>
                    <th className="py-3 px-2">Liveness Check</th>
                    <th className="py-3 px-2">SSID Network</th>
                    <th className="py-3 px-2">GPS Accuracy</th>
                    <th className="py-3 px-2 text-right">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {employeeLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/20 transition-all">
                      <td className="py-3 px-2 flex items-center gap-2.5">
                        <img 
                          src={log.photoUrl} 
                          alt="Face Selfie" 
                          className="w-8 h-8 rounded-lg object-cover border border-indigo-500/20 shadow" 
                        />
                        <div>
                          <span className="font-bold block text-slate-200">Liveness Match</span>
                          <span className="text-[9px] font-mono text-slate-500">ID: {log.id}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-slate-300 font-mono">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-2">
                        <span className="px-1.5 py-0.5 bg-slate-950 rounded text-[10px] font-semibold text-indigo-400 border border-slate-800">
                          {log.method}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-full max-w-[60px] bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${log.livenessScore >= settings.livenessThreshold ? 'bg-emerald-500' : 'bg-red-500'}`}
                              style={{ width: `${log.livenessScore}%` }}
                            ></div>
                          </div>
                          <span className="font-mono font-bold text-[10px] text-slate-300">{log.livenessScore}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`font-mono text-[10px] block ${
                          log.wifiStatus === 'Secure WiFi' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {log.ssidMatched}
                        </span>
                        <span className="text-[8px] text-slate-500 block">Status: {log.wifiStatus}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="font-mono text-slate-300">± {log.gpsAccuracy.toFixed(1)}m</span>
                        <span className={`block text-[9px] ${
                          log.gpsStatus === 'Exact' ? 'text-emerald-400' : 'text-red-400'
                        }`}>{log.gpsStatus}</span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          log.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          log.status === 'Late' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          log.status === 'Flagged' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-slate-500/10 text-slate-400'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {employeeLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500">
                        No logs found for this session. Use "Clock-in" on the dashboard to create one!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: GATE PASS DESK */}
        {activeTab === 'gatepass' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Employee Gate Pass & Out Clearance</h2>
                <p className="text-xs text-slate-400">Generate authorized smart passes with digital QR locks for off-campus departure.</p>
              </div>
              <button
                onClick={() => setShowGatePassForm(true)}
                className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/15 active:scale-95"
              >
                <QrCode className="w-4 h-4" />
                Apply for Departure Pass
              </button>
            </div>

            {/* Quick status overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-800 p-4.5 rounded-2xl text-left space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Current Pass Status</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${activeOutPass ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`}></div>
                  <span className="text-sm font-extrabold text-slate-200">
                    {activeOutPass ? `Active - ${activeOutPass.status}` : 'No Active Passes'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block">Requires QR validation at security.</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4.5 rounded-2xl text-left space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">WiFi Lock Match</span>
                <span className="text-sm font-mono font-extrabold text-indigo-300 block">
                  {currentWifiSSID}
                </span>
                <span className="text-[10px] text-slate-400 block">Security logs SSID mismatches.</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4.5 rounded-2xl text-left space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">GPS Drift Margin</span>
                <span className="text-sm font-mono font-extrabold text-emerald-400 block">
                  ±{gpsAccuracy.toFixed(1)} Meters
                </span>
                <span className="text-[10px] text-slate-400 block">Inside Stanford Main Perimeter.</span>
              </div>
            </div>

            {/* Active pass scanner simulator if there is an approved or active out pass */}
            {activeOutPass ? (
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800">
                  <div className="text-left">
                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-[9px] font-mono uppercase font-bold tracking-wider">
                      Active Authorized Key
                    </span>
                    <h3 className="font-extrabold text-base text-white mt-1.5">Reason: {activeOutPass.reason}</h3>
                    <p className="text-xs text-slate-400">Pass ID: {activeOutPass.id} • Type: {activeOutPass.type} ({activeOutPass.validDurationHours} Hours duration)</p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {activeOutPass.status === 'Active Out' ? (
                      <button
                        onClick={() => {
                          onUpdateGatePass(activeOutPass.id, 'Returned');
                          const newNotif: Notification = {
                            id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
                            recipientId: 'admin',
                            title: 'Gate Pass Return Checked',
                            message: `${employee.name} returned to campus and checked in.`,
                            type: 'success',
                            timestamp: 'Just now',
                            read: false
                          };
                          onAddNotification(newNotif);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/15"
                      >
                        Simulate Re-entry scan
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onUpdateGatePass(activeOutPass.id, 'Active Out');
                          const newNotif: Notification = {
                            id: `NT-${Math.floor(1000 + Math.random() * 9000)}`,
                            recipientId: 'admin',
                            title: 'Campus Departure',
                            message: `${employee.name} has clocked out of main security gate.`,
                            type: 'info',
                            timestamp: 'Just now',
                            read: false
                          };
                          onAddNotification(newNotif);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all animate-pulse"
                      >
                        Simulate Exit Gate Scan
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* QR Visual representation */}
                  <div className="bg-slate-900/80 border border-slate-850 rounded-xl p-4.5 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-3">
                      Clearance Gate QR Code
                    </span>

                    <div className="bg-white p-2 rounded-xl inline-block">
                      <svg viewBox="0 0 100 100" className="w-36 h-36">
                        <rect width="100" height="100" fill="white" />
                        <path d="M10 10h20v20H10zM15 15h10v10H15zM70 10h20v20H70zM75 15h10v10H75zM10 70h20v20H10zM15 75h10v10H15zM40 40h20v20H40zM45 45h10v10H45zM40 10h10v10H40zM50 30h10v10H50zM30 50h10v10H30zM60 70h10v10H60zM70 60h20v10H70zM80 80h10v10H80z" fill="black" />
                      </svg>
                    </div>

                    <span className="text-[9.5px] font-mono text-slate-300 mt-3 select-all bg-slate-950 px-3 py-1 rounded border border-slate-800">
                      {activeOutPass.qrCodeVal}
                    </span>
                  </div>

                  {/* Details list */}
                  <div className="bg-slate-900/80 border border-slate-850 rounded-xl p-4.5 text-xs text-left space-y-3">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block border-b border-slate-800 pb-1.5">
                      Telemetry details
                    </span>
                    
                    <div>
                      <span className="text-slate-500 block">Approval status:</span>
                      <span className="text-emerald-400 font-bold text-xs uppercase">{activeOutPass.status}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Requested Duration:</span>
                      <span className="text-slate-200 font-bold">{activeOutPass.validDurationHours} Hours</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Requested Departure Time:</span>
                      <span className="text-slate-200 font-mono">{activeOutPass.requestTime}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Authorized Gatekeeper:</span>
                      <span className="text-indigo-300 font-semibold">{activeOutPass.authorizedBy || 'Dean Office'}</span>
                    </div>
                  </div>

                  {/* Timer */}
                  <div className="bg-slate-900/80 border border-slate-850 rounded-xl p-4.5 flex flex-col items-center justify-center text-center space-y-2">
                    <Clock className="w-7 h-7 text-amber-400 animate-spin-slow" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                      Out-Of-Bounds Countdown
                    </span>

                    {activeOutPass.expiryTime ? (
                      <div>
                        <span className="text-2xl font-black font-mono text-amber-400 block animate-pulse">
                          {Math.max(0, Math.floor((new Date(activeOutPass.expiryTime).getTime() - currentTime.getTime()) / 60000))} Mins
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-1">
                          Must return inside geofence perimeter before expiration to prevent system alert flags.
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs text-slate-300 font-bold">Awaiting exit scan</span>
                        <p className="text-[9px] text-slate-500 mt-1">Scan QR code at exit gateway to activate countdown clock.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-4">
                <QrCode className="w-12 h-12 text-indigo-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-100">No active gate passes found</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You are currently registered inside the campus perimeter. If you need to leave the physical boundaries during shift hours, apply for an authorized exit pass above to bypass automatic absent flags.
                </p>
                <button
                  onClick={() => setShowGatePassForm(true)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all inline-block"
                >
                  Create Departure Pass Request
                </button>
              </div>
            )}

            {/* Historical passes */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-bold text-sm text-slate-200 text-left mb-4">Past Gate Pass Log History</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-850 text-[9px] uppercase tracking-wider font-bold text-slate-500">
                      <th className="py-2">Pass ID</th>
                      <th className="py-2">Reason</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Request Time</th>
                      <th className="py-2">Approved By</th>
                      <th className="py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {gatePasses.filter(pass => pass.employeeId === employee.id).map((pass) => (
                      <tr key={pass.id} className="hover:bg-slate-900/30 transition-all">
                        <td className="py-3 font-mono font-bold text-indigo-400">{pass.id}</td>
                        <td className="py-3 font-semibold text-white">{pass.reason}</td>
                        <td className="py-3">{pass.type}</td>
                        <td className="py-3 font-mono">{pass.requestTime}</td>
                        <td className="py-3 text-slate-400">{pass.authorizedBy || 'Pending'}</td>
                        <td className="py-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            pass.status === 'Returned' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                            pass.status === 'Pending' ? 'bg-amber-500/15 text-amber-400 animate-pulse' :
                            pass.status === 'Rejected' ? 'bg-rose-500/15 text-rose-400' :
                            'bg-indigo-500/15 text-indigo-400'
                          }`}>
                            {pass.status}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {gatePasses.filter(pass => pass.employeeId === employee.id).length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-500">
                          No historical gate passes found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LEAVES */}
        {activeTab === 'leaves' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Leaves Center</h2>
                <p className="text-xs text-slate-400">Apply for university leaves and monitor approval pipelines.</p>
              </div>
            </div>

            {/* Leave balances */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Casual Leave', count: currentBalance.casual, color: 'from-indigo-500 to-indigo-600' },
                { label: 'Sick Leave', count: currentBalance.sick, color: 'from-rose-500 to-rose-600' },
                { label: 'Earned Leave', count: currentBalance.earned, color: 'from-emerald-500 to-emerald-600' }
              ].map((bal) => (
                <div key={bal.label} className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4 space-y-2 text-center">
                  <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider block">{bal.label}</span>
                  <span className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${bal.color} block font-mono`}>
                    {bal.count}
                  </span>
                  <span className="text-[10px] text-slate-400">Days remaining</span>
                </div>
              ))}
            </div>

            {/* Bottom Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {/* Application form */}
              <div className="bg-slate-950 border border-slate-800/60 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-indigo-400 uppercase tracking-wide">Submit Leave Application</h3>
                <form onSubmit={handleLeaveSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Leave Category</label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Casual Leave">Casual Leave</option>
                      <option value="Sick Leave">Sick Leave</option>
                      <option value="Earned Leave">Earned Leave</option>
                      <option value="Duty Leave">Duty Leave (Representing Campus)</option>
                      <option value="Short Leave">Short Leave (Few Hours permission)</option>
                      <option value="Outdoor Duty">Outdoor Duty / Field Research Clearance</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={leaveStart}
                        onChange={(e) => setLeaveStart(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={leaveEnd}
                        onChange={(e) => setLeaveEnd(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Justification / Reason</label>
                    <textarea
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      rows={3}
                      placeholder="Please provide professional explanation..."
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {leaveSubmitted && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2 font-medium">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      Application logged successfully. Synchronizing to HR control hub.
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-all"
                  >
                    File Application
                  </button>
                </form>
              </div>

              {/* Past leaves tracker */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm">Historical Leave Applications</h3>
                <div className="space-y-3">
                  {employeeLeaves.map((lv) => (
                    <div key={lv.id} className="bg-slate-950 border border-slate-850 p-4 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold block text-white">{lv.type}</span>
                          <span className="text-[9px] text-slate-500 font-mono">{lv.startDate} to {lv.endDate} ({lv.totalDays} days)</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          lv.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                          lv.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 animate-pulse' :
                          'bg-rose-500/10 text-rose-400'
                        }`}>
                          {lv.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 italic">
                        "{lv.reason}"
                      </p>

                      {lv.approverNotes && (
                        <div className="p-2 bg-slate-900 rounded-xl border border-slate-800/50 text-[10px] text-slate-400">
                          <span className="font-bold block text-indigo-400 mb-0.5">Approver Notes:</span>
                          {lv.approverNotes}
                        </div>
                      )}
                    </div>
                  ))}

                  {employeeLeaves.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No leave applications recorded.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SHIFTS & SWAPS */}
        {activeTab === 'shift' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Shift Schedule & Exchanges</h2>
                <p className="text-xs text-slate-400">View your active hours and file exchange requests with colleagues.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* active schedule */}
              <div className="bg-slate-950 border border-slate-800/60 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-indigo-400 uppercase tracking-wide">Assigned Shift Pattern</h3>
                <div className="space-y-3">
                  {employeeShifts.map((sf) => (
                    <div key={sf.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-200">{sf.shiftName}</span>
                        <span className="px-2 py-0.5 bg-slate-950 text-slate-400 text-[9px] font-bold rounded font-mono">
                          {sf.day}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs font-mono text-indigo-300 pt-1">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{sf.timeString}</span>
                      </div>

                      {sf.swapRequest ? (
                        <div className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[10px] text-amber-400 mt-3 flex items-center justify-between">
                          <div>
                            <span className="font-bold block">Exchanged Swap Pending</span>
                            <span>With: {sf.swapRequest.swapWithEmployeeName}</span>
                          </div>
                          <span className="font-bold uppercase tracking-wider bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[9px]">
                            {sf.swapRequest.status}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedSwapShift(sf);
                            setShowSwapModal(true);
                          }}
                          className="w-full mt-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-850 hover:border-indigo-500 hover:text-white rounded-xl text-[10px] font-bold transition-all"
                        >
                          Request Shift Swap
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Swap rules info */}
              <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl text-slate-300 space-y-4">
                <h3 className="font-bold text-sm text-slate-200">University Shift swap Policies</h3>
                <ul className="space-y-2.5 text-xs text-slate-400 list-disc pl-4">
                  <li>Swaps can only be executed with qualified members inside the same administrative department.</li>
                  <li>The target colleague must log in and approve the swap request before it routes to HR.</li>
                  <li>Strict geofence logs apply to swapped shifts: WiFi and GPS constraints remain strictly active.</li>
                  <li>A maximum of 3 swap operations is permitted per calendar cycle.</li>
                </ul>

                <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 text-indigo-300 rounded-xl text-[10px] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Compliance warning: Unauthorized absences during swapped slots report immediately.</span>
                </div>
              </div>
            </div>

            {/* Swap Request Modal */}
            {showSwapModal && selectedSwapShift && (
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl text-white animate-scale-up">
                  <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <h3 className="font-extrabold text-sm uppercase text-indigo-400">Propose Shift Swap</h3>
                    <button onClick={() => setShowSwapModal(false)} className="text-slate-400 hover:text-white transition-all">✕</button>
                  </div>

                  <form onSubmit={handleSwapSubmit} className="p-6 space-y-4">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">Selected Shift to Swap</span>
                      <span className="font-bold block">{selectedSwapShift.shiftName}</span>
                      <span className="font-mono text-indigo-300 block">{selectedSwapShift.timeString}</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Select Coworker to Swap With</label>
                      <select
                        value={targetCoworkerId}
                        onChange={(e) => setTargetCoworkerId(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Select Colleague --</option>
                        {employees.filter(emp => emp.id !== employee.id).map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.department})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSwapModal(false)}
                        className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white"
                      >
                        Submit Swap Proposal
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Biometric Alert Feed</h2>
                <p className="text-xs text-slate-400">Important system warnings, gate pass approvals, and geofence notifications.</p>
              </div>
            </div>

            <div className="space-y-3">
              {employeeNotifs.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl border flex gap-3 items-start ${
                    notif.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
                    notif.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' :
                    notif.type === 'danger' ? 'bg-red-500/5 border-red-500/20 text-red-400' :
                    'bg-indigo-500/5 border-indigo-500/20 text-indigo-400'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {notif.type === 'success' && <CheckCircle className="w-4.5 h-4.5" />}
                    {notif.type === 'warning' && <AlertTriangle className="w-4.5 h-4.5 animate-pulse" />}
                    {notif.type === 'danger' && <ShieldAlert className="w-4.5 h-4.5" />}
                    {notif.type === 'info' && <Bell className="w-4.5 h-4.5" />}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs font-bold block text-slate-200">{notif.title}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{notif.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    {!notif.read && (
                      <button
                        onClick={() => onUpdateNotification(notif.id)}
                        className="text-[9px] font-bold text-indigo-400 hover:underline mt-2"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {employeeNotifs.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No system notifications available.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: PROFILE & ID CARD */}
        {activeTab === 'profile' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Smart ID & Profile</h2>
                <p className="text-xs text-slate-400">Campus smart-badge containing registered biometric metrics.</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
              
              {/* Smart ID Card Representation */}
              <div className="w-full max-w-sm shrink-0 select-none">
                <div 
                  onClick={() => setShowIDCardBack(!showIDCardBack)}
                  className={`w-full aspect-[1.58/1] bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-2xl cursor-pointer transition-all duration-500 transform preserve-3d hover:rotate-y-6 ${
                    showIDCardBack ? '[transform:rotateY(180deg)]' : ''
                  }`}
                >
                  {/* Holographic background lines */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none"></div>

                  {/* CARD FRONT */}
                  <div className={`absolute inset-0 p-5 flex flex-col justify-between backface-hidden ${showIDCardBack ? 'hidden' : ''}`}>
                    {/* Card Header */}
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[8px] uppercase tracking-widest font-bold text-indigo-400 block">UNIVERSITY OF TECHNOLOGY</span>
                        <span className="text-[9px] font-bold text-white">SMART-PASS BIO CARD</span>
                      </div>
                      <div className="p-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                        <Eye className="w-4 h-4 text-indigo-400" />
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="flex gap-3.5 items-center my-auto">
                      <img 
                        src={employee.avatarUrl} 
                        alt={employee.name} 
                        className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-500/40 shadow-lg shadow-indigo-600/5 shrink-0"
                      />
                      <div className="min-w-0 text-left">
                        <h3 className="font-black text-base text-white truncate">{employee.name}</h3>
                        <span className="text-[10px] text-indigo-400 font-semibold block">{employee.role}</span>
                        
                        <div className="mt-2 space-y-0.5 font-mono text-[8px] text-slate-400">
                          <div>
                            <span className="text-slate-500">ID:</span> {employee.id}
                          </div>
                          <div>
                            <span className="text-slate-500">RFID:</span> {employee.rfidCardNumber}
                          </div>
                          <div>
                            <span className="text-slate-500">DEPT:</span> {employee.department}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="flex justify-between items-center border-t border-slate-800/60 pt-3.5">
                      <div className="flex items-center gap-1 text-[9px] text-slate-500">
                        <MapPin className="w-3 h-3 text-indigo-400" />
                        <span>GPS locked</span>
                      </div>
                      
                      {/* Mock Barcode */}
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex gap-0.5 h-4 items-end">
                          {[1, 3, 1, 2, 4, 1, 3, 2, 1, 2, 1, 3, 1, 4].map((w, i) => (
                            <div key={i} className="bg-slate-300 h-full" style={{ width: `${w}px` }}></div>
                          ))}
                        </div>
                        <span className="text-[7px] font-mono text-slate-500">TAP TO VIEW BACK</span>
                      </div>
                    </div>
                  </div>

                  {/* CARD BACK */}
                  <div className={`absolute inset-0 p-5 flex flex-col justify-between bg-slate-950 border border-slate-800 rounded-2xl transform [transform:rotateY(180deg)] backface-hidden ${!showIDCardBack ? 'hidden' : ''}`}>
                    <div className="space-y-3 text-left">
                      <span className="text-[9px] uppercase tracking-widest font-bold text-indigo-400 block border-b border-slate-800 pb-1.5">
                        BIOMETRIC SIGNATURE VECTOR
                      </span>

                      <div className="grid grid-cols-2 gap-3 text-[9px] font-mono text-slate-400">
                        <div>
                          <span className="text-slate-500 block">Allowed WiFi SSID:</span>
                          <span className="text-slate-200">{employee.allowedWifiSSID}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Registered Device MAC:</span>
                          <span className="text-slate-200 font-mono">{employee.macAddress}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Liveness Registered:</span>
                          <span className="text-emerald-400">{employee.livenessRegisteredAt || 'Pending registration'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Smart Key status:</span>
                          <span className="text-indigo-400">ACTIVE PIN LOCK</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/60 pt-3 text-center space-y-1">
                      <p className="text-[7px] text-slate-500 leading-tight">
                        This smart card contains encrypted RFID tags for gate scanner interaction. 
                        Security alerts trigger if used outside 10m GPS perimeter drift limits.
                      </p>
                      <span className="text-[8px] text-indigo-400 font-bold uppercase tracking-wider block">
                        TAP CARD TO RETURN FRONT
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Detailed Info and controls */}
              <div className="flex-1 self-stretch bg-slate-950 border border-slate-850 rounded-2xl p-5 space-y-4 text-xs">
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">Employee Identity Telemetry</h3>
                
                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Corporate Email</span>
                    <span className="text-slate-200 truncate block mt-1 text-[11px]">{employee.email}</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Registered Mobile</span>
                    <span className="text-slate-200 block mt-1 text-[11px]">{employee.phone}</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 col-span-2">
                    <span className="text-slate-500 text-[10px] block">Campus Core Coordinates Target</span>
                    <span className="text-indigo-300 block mt-1 text-[11px]">
                      Latitude: {employee.gpsCoords.lat.toFixed(6)}°N • Longitude: {employee.gpsCoords.lng.toFixed(6)}°W
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-slate-400 leading-relaxed space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-white text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Anti-spoof security status</span>
                  </div>
                  <p className="text-[11px]">
                    Your face and biometric model are registered with 3D liveness anti-spoof. Any attempted clock-in using high-resolution pictures, video loops, or synthetic masks will trigger an automatic administrator lock and lock down access points.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
};
