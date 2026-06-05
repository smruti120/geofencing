import React, { useState } from 'react';
import { QrCode, Upload, Mail, Smartphone, Download, Users, Calendar, Clock, Search, Plus, FileSpreadsheet } from 'lucide-react';

interface EventAttendee {
  id: string;
  studentId: string;
  name: string;
  department: string;
  course: string;
  batch: string;
  mobile: string;
  email: string;
  qrCode: string;
  entryTime?: string;
  exitTime?: string;
  status: 'registered' | 'entered' | 'exited' | 'no-show';
  emailSent: boolean;
  smsSent: boolean;
}

interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  expiryTimestamp: string;
  location: string;
  attendees: EventAttendee[];
  status: 'upcoming' | 'ongoing' | 'completed';
}

interface EventModuleProps {
  isAdmin?: boolean;
}

export const EventModule: React.FC<EventModuleProps> = ({ isAdmin = true }) => {
  const [events, setEvents] = useState<Event[]>([
    {
      id: 'EVT-2026-001',
      name: 'Annual Tech Symposium 2026',
      description: 'A gathering of tech enthusiasts and innovators',
      date: '2026-03-15',
      startTime: '09:00 AM',
      endTime: '05:00 PM',
      expiryTimestamp: '2026-03-15T23:59:59',
      location: 'Main Auditorium',
      status: 'upcoming',
      attendees: []
    }
  ]);
  
  const [activeEventId, setActiveEventId] = useState<string>('EVT-2026-001');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [scanMode, setScanMode] = useState<'entry' | 'exit'>('entry');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [csvText, setCsvText] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(true);
  
  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: ''
  });

  const activeEvent = events.find(e => e.id === activeEventId);

  // Generate unique QR code
  const generateQRCode = (eventId: string, studentId: string) => {
    return `EVENT-${eventId}-${studentId}-${Date.now()}`;
  };

  // Create new event
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const event: Event = {
      id: `EVT-2026-${Math.floor(100 + Math.random() * 899)}`,
      name: newEvent.name,
      description: newEvent.description,
      date: newEvent.date,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      expiryTimestamp: `${newEvent.date}T23:59:59`,
      location: newEvent.location,
      status: 'upcoming',
      attendees: []
    };
    setEvents([...events, event]);
    setActiveEventId(event.id);
    setShowCreateEvent(false);
    setNewEvent({ name: '', description: '', date: '', startTime: '', endTime: '', location: '' });
  };

  // Process CSV upload
  const handleCSVUpload = () => {
    if (!activeEvent || !csvText.trim()) return;
    
    const rows = csvText.trim().split('\n');
    const newAttendees: EventAttendee[] = [];
    
    rows.forEach((row, index) => {
      const cols = row.split(',').map(c => c.trim());
      if (cols.length >= 7) {
        const studentId = cols[0];
        const name = cols[1];
        const department = cols[2];
        const course = cols[3];
        const batch = cols[4];
        const mobile = cols[5];
        const email = cols[6];
        
        const attendee: EventAttendee = {
          id: `ATT-${Date.now()}-${index}`,
          studentId,
          name,
          department,
          course,
          batch,
          mobile,
          email,
          qrCode: generateQRCode(activeEvent.id, studentId),
          status: 'registered',
          emailSent: sendEmail,
          smsSent: sendSMS
        };
        newAttendees.push(attendee);
      }
    });
    
    // Update event with new attendees
    setEvents(events.map(e => 
      e.id === activeEventId 
        ? { ...e, attendees: [...e.attendees, ...newAttendees] }
        : e
    ));
    
    setShowBulkUpload(false);
    setCsvText('');
    
    // Show notification
    alert(`Successfully registered ${newAttendees.length} attendees!\n${sendEmail ? 'Emails sent!' : ''}\n${sendSMS ? 'SMS sent!' : ''}`);
  };

  // Simulate QR Scan
  const handleQRScan = (qrCode: string) => {
    if (!activeEvent) return;
    
    const attendee = activeEvent.attendees.find(a => a.qrCode === qrCode);
    if (!attendee) {
      setScanResult('Invalid QR Code');
      return;
    }
    
    const now = new Date().toLocaleTimeString();
    
    if (scanMode === 'entry') {
      if (attendee.status === 'entered' || attendee.status === 'exited') {
        setScanResult(`${attendee.name} already entered!`);
        return;
      }
      attendee.status = 'entered';
      attendee.entryTime = now;
      setScanResult(`Welcome ${attendee.name}! Entry recorded at ${now}`);
    } else {
      if (attendee.status !== 'entered') {
        setScanResult(`${attendee.name} has not entered yet!`);
        return;
      }
      attendee.status = 'exited';
      attendee.exitTime = now;
      setScanResult(`Goodbye ${attendee.name}! Exit recorded at ${now}`);
    }
    
    // Update events state
    setEvents([...events]);
  };

  // Download report
  const downloadReport = () => {
    if (!activeEvent) return;
    
    const reportData = activeEvent.attendees.map(a => ({
      'Student ID': a.studentId,
      'Name': a.name,
      'Department': a.department,
      'Course': a.course,
      'Batch': a.batch,
      'Mobile': a.mobile,
      'Email': a.email,
      'Status': a.status,
      'Entry Time': a.entryTime || '-',
      'Exit Time': a.exitTime || '-',
      'QR Code': a.qrCode
    }));
    
    // Convert to CSV
    const headers = Object.keys(reportData[0] || {}).join(',');
    const rows = reportData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeEvent.name}-Report.csv`;
    a.click();
  };

  // Filter attendees
  const filteredAttendees = activeEvent?.attendees.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.department.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Stats
  const stats = {
    total: activeEvent?.attendees.length || 0,
    entered: activeEvent?.attendees.filter(a => a.status === 'entered' || a.status === 'exited').length || 0,
    exited: activeEvent?.attendees.filter(a => a.status === 'exited').length || 0,
    noShow: activeEvent?.attendees.filter(a => a.status === 'registered').length || 0
  };

  if (!isAdmin) {
    // Student View - Show their QR Code
    const studentAttendee = activeEvent?.attendees.find(a => a.studentId === 'STU-2026-01'); // Mock current student
    
    return (
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            My Event Pass
          </h2>
          
          {studentAttendee ? (
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl text-center">
              <h3 className="text-lg font-bold text-indigo-400 mb-2">{activeEvent?.name}</h3>
              <p className="text-sm text-slate-400 mb-4">{activeEvent?.date} • {activeEvent?.location}</p>
              
              <div className="bg-white p-4 rounded-xl inline-block mb-4">
                <svg viewBox="0 0 100 100" className="w-48 h-48">
                  <rect width="100" height="100" fill="white" />
                  <path d="M10 10h20v20H10zM15 15h10v10H15zM70 10h20v20H70zM75 15h10v10H75zM10 70h20v20H10zM15 75h10v10H15zM40 40h20v20H40zM45 45h10v10H45zM40 10h10v10H40zM50 30h10v10H50zM30 50h10v10H30zM60 70h10v10H60zM70 60h20v10H70zM80 80h10v10H80z" fill="black" />
                </svg>
              </div>
              
              <div className="bg-slate-900 p-3 rounded-lg font-mono text-xs text-slate-400 mb-4">
                {studentAttendee.qrCode}
              </div>
              
              <div className="text-sm text-slate-300 space-y-1">
                <p><strong>Name:</strong> {studentAttendee.name}</p>
                <p><strong>ID:</strong> {studentAttendee.studentId}</p>
                <p><strong>Department:</strong> {studentAttendee.department}</p>
                <p><strong>Course:</strong> {studentAttendee.course}</p>
              </div>
              
              {studentAttendee.status === 'entered' && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-emerald-400 font-bold">✓ Entry Recorded</p>
                  <p className="text-xs text-emerald-400/70">{studentAttendee.entryTime}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500">
              <p>You are not registered for any upcoming events.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Event Management System
            </h2>
            <p className="text-xs text-slate-400 mt-1">QR-based attendance tracking with email/SMS notifications</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateEvent(true)}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Event
            </button>
            <button
              onClick={() => setShowQRScanner(true)}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              Scan QR
            </button>
          </div>
        </div>
      </div>

      {/* Event Selector */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
        <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Select Event</label>
        <select
          value={activeEventId}
          onChange={(e) => setActiveEventId(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm"
        >
          {events.map(event => (
            <option key={event.id} value={event.id}>
              {event.name} ({event.date})
            </option>
          ))}
        </select>
      </div>

      {/* Active Event Details */}
      {activeEvent && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-indigo-400">{activeEvent.name}</h3>
              <p className="text-sm text-slate-400">{activeEvent.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {activeEvent.date}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {activeEvent.startTime} - {activeEvent.endTime}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {stats.total} Registered</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkUpload(true)}
                className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Bulk Upload
              </button>
              <button
                onClick={() => setShowReports(true)}
                className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Reports
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
              <span className="text-2xl font-black text-indigo-400 block">{stats.total}</span>
              <span className="text-xs text-slate-400">Total Registered</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
              <span className="text-2xl font-black text-emerald-400 block">{stats.entered}</span>
              <span className="text-xs text-slate-400">Entered</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
              <span className="text-2xl font-black text-amber-400 block">{stats.exited}</span>
              <span className="text-xs text-slate-400">Exited</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
              <span className="text-2xl font-black text-slate-400 block">{stats.noShow}</span>
              <span className="text-xs text-slate-400">Not Arrived</span>
            </div>
          </div>

          {/* Search & Attendees List */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, student ID, or department..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white"
              />
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="p-3">Student Info</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Entry/Exit</th>
                    <th className="p-3">Notifications</th>
                    <th className="p-3">QR Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredAttendees.map(attendee => (
                    <tr key={attendee.id} className="hover:bg-slate-900/50">
                      <td className="p-3">
                        <div>
                          <span className="font-bold text-white block">{attendee.name}</span>
                          <span className="text-slate-400 text-[10px]">{attendee.studentId}</span>
                          <span className="text-slate-500 text-[10px] block">{attendee.department} • {attendee.course}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-400 block">{attendee.email}</span>
                        <span className="text-slate-500 text-[10px]">{attendee.mobile}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          attendee.status === 'entered' ? 'bg-emerald-500/10 text-emerald-400' :
                          attendee.status === 'exited' ? 'bg-amber-500/10 text-amber-400' :
                          attendee.status === 'registered' ? 'bg-slate-500/10 text-slate-400' :
                          'bg-rose-500/10 text-rose-400'
                        }`}>
                          {attendee.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-slate-400">
                        {attendee.entryTime && <div>In: {attendee.entryTime}</div>}
                        {attendee.exitTime && <div>Out: {attendee.exitTime}</div>}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {attendee.emailSent && <Mail className="w-3 h-3 text-indigo-400" />}
                          {attendee.smsSent && <Smartphone className="w-3 h-3 text-emerald-400" />}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="w-12 h-12 bg-white rounded p-1">
                          <svg viewBox="0 0 100 100" className="w-full h-full">
                            <rect width="100" height="100" fill="white" />
                            <path d="M10 10h20v20H10zM15 15h10v10H15zM70 10h20v20H70zM75 15h10v10H75zM10 70h20v20H10zM15 75h10v10H15zM40 40h20v20H40zM45 45h10v10H45zM40 10h10v10H40zM50 30h10v10H50zM30 50h10v10H30zM60 70h10v10H60zM70 60h20v10H70zM80 80h10v10H80z" fill="black" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAttendees.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">
                        No attendees registered. Use Bulk Upload to add attendees.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white">
            <h3 className="font-bold text-lg mb-4">Create New Event</h3>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Event Name</label>
                <input
                  type="text"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Date</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Location</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">End Time</label>
                  <input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateEvent(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-white">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-400" />
              Bulk Upload Attendees
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Upload CSV with columns: StudentID, Name, Department, Course, Batch, Mobile, Email
            </p>
            
            <div className="space-y-4">
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="STU-001,John Doe,Computer Science,B.Tech,2024,+1234567890,john@email.com&#10;STU-002,Jane Smith,Bio-Engineering,B.Sc,2024,+1234567891,jane@email.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-mono h-40"
              />
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="rounded accent-indigo-500"
                  />
                  <Mail className="w-4 h-4 text-indigo-400" />
                  Send Email
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sendSMS}
                    onChange={(e) => setSendSMS(e.target.checked)}
                    className="rounded accent-indigo-500"
                  />
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  Send SMS
                </label>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBulkUpload(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCSVUpload}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold"
                >
                  Upload & Notify
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-400" />
              QR Scanner
            </h3>
            
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setScanMode('entry')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold ${
                  scanMode === 'entry' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Entry Mode
              </button>
              <button
                onClick={() => setScanMode('exit')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold ${
                  scanMode === 'exit' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Exit Mode
              </button>
            </div>
            
            <div className="bg-slate-950 border-2 border-dashed border-slate-700 rounded-xl p-8 text-center mb-4">
              <QrCode className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-sm text-slate-400">Simulate QR Scan</p>
              <input
                type="text"
                placeholder="Paste QR code here..."
                onChange={(e) => handleQRScan(e.target.value)}
                className="w-full mt-3 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-center"
                autoFocus
              />
            </div>
            
            {scanResult && (
              <div className={`p-3 rounded-xl text-center text-sm ${
                scanResult.includes('Welcome') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                scanResult.includes('Goodbye') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {scanResult}
              </div>
            )}
            
            <button
              onClick={() => {
                setShowQRScanner(false);
                setScanResult(null);
              }}
              className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold"
            >
              Close Scanner
            </button>
          </div>
        </div>
      )}

      {/* Reports Modal */}
      {showReports && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-white max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                Event Report
              </h3>
              <button
                onClick={() => setShowReports(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-950 p-3 rounded-xl text-center">
                <span className="text-xl font-bold text-indigo-400 block">{stats.total}</span>
                <span className="text-xs text-slate-400">Registered</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl text-center">
                <span className="text-xl font-bold text-emerald-400 block">{stats.entered}</span>
                <span className="text-xs text-slate-400">Attended</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl text-center">
                <span className="text-xl font-bold text-amber-400 block">{stats.exited}</span>
                <span className="text-xs text-slate-400">Completed</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl text-center">
                <span className="text-xl font-bold text-rose-400 block">
                  {stats.total > 0 ? Math.round((stats.entered / stats.total) * 100) : 0}%
                </span>
                <span className="text-xs text-slate-400">Attendance Rate</span>
              </div>
            </div>
            
            <button
              onClick={downloadReport}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download CSV Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
