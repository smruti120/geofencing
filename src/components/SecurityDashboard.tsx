import React from 'react';
import { AttendanceLog, GatePass, Vendor } from '../types';
import { Shield, AlertTriangle, CheckCircle, Clock, Truck, User } from 'lucide-react';

interface SecurityDashboardProps {
  logs: AttendanceLog[];
  gatePasses: GatePass[];
  vendors: Vendor[];
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ logs, gatePasses, vendors }) => {
  const flaggedLogs = logs.filter(log => log.status === 'Flagged');
  const activeGatePasses = gatePasses.filter(pass => pass.status === 'Active Out' || pass.status === 'Approved');

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-400" /> Security Gate & Visitors Monitor</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-center">
            <span className="text-2xl font-black text-emerald-400 block">{vendors.filter(v => v.status === 'On-Site').length}</span>
            <span className="text-xs text-slate-400">Vendors On-Site</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-center">
            <span className="text-2xl font-black text-amber-400 block">{activeGatePasses.length}</span>
            <span className="text-xs text-slate-400">Active Staff Gate Passes</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-center">
            <span className="text-2xl font-black text-rose-400 block">{flaggedLogs.length}</span>
            <span className="text-xs text-slate-400">Security Alerts / Flags</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Gate Pass Monitor */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Active Staff Departures</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {activeGatePasses.map(pass => (
                <div key={pass.id} className="bg-slate-900 p-3 rounded-lg text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-bold">{pass.employeeName}</span>
                    <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[9px] font-bold">{pass.status}</span>
                  </div>
                  <p className="text-slate-400 mt-1">{pass.reason} • Valid for {pass.validDurationHours}h</p>
                  {pass.expiryTime && (
                    <p className="text-[10px] text-amber-400 font-mono mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Expires: {new Date(pass.expiryTime).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              ))}
              {activeGatePasses.length === 0 && <p className="text-slate-500 text-center py-4">No active departures.</p>}
            </div>
          </div>

          {/* Vendor Monitoring */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2"><Truck className="w-4 h-4" /> Vendor Gate Logs</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {vendors.map(vendor => (
                <div key={vendor.id} className="bg-slate-900 p-3 rounded-lg text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-bold">{vendor.companyName}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      vendor.status === 'On-Site' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                    }`}>{vendor.status}</span>
                  </div>
                  <p className="text-slate-400 mt-1">{vendor.vehicleNumber} • {vendor.purpose}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Security Alerts */}
          <div className="bg-slate-950 border border-rose-900/30 rounded-xl p-4 lg:col-span-2">
            <h3 className="text-sm font-bold text-rose-400 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Live Security Alerts & Flags</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {flaggedLogs.map(log => (
                <div key={log.id} className="bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-rose-300">{log.employeeName}</span>
                    <span className="text-rose-400/70 block text-[10px]">{log.timestamp} • {log.method}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-rose-400 font-bold block">{log.status}</span>
                    <span className="text-[10px] text-rose-400/70">Liveness: {log.livenessScore}% • GPS: {log.gpsStatus}</span>
                  </div>
                </div>
              ))}
              {flaggedLogs.length === 0 && <p className="text-slate-500 text-center py-4 flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> All systems secure. No flags.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
