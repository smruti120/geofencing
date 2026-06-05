import React, { useState } from 'react';
import { Student } from '../types';
import { User, CreditCard, Clock, LogIn, LogOut, ShieldCheck } from 'lucide-react';

interface StudentPortalProps {
  student: Student;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ student }) => {
  const [entryLog, setEntryLog] = useState<{ time: string; type: 'Entry' | 'Exit'; method: 'Face' | 'RFID' }[]>([]);

  const handleEntry = (method: 'Face' | 'RFID') => {
    const now = new Date().toLocaleTimeString();
    setEntryLog(prev => [{ time: now, type: 'Entry', method }, ...prev]);
  };

  const handleExit = (method: 'Face' | 'RFID') => {
    const now = new Date().toLocaleTimeString();
    setEntryLog(prev => [{ time: now, type: 'Exit', method }, ...prev]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4 mb-6">
          <img src={student.avatarUrl} alt={student.name} className="w-16 h-16 rounded-full border-2 border-indigo-500" />
          <div>
            <h2 className="text-xl font-bold">{student.name}</h2>
            <p className="text-sm text-slate-400">{student.course} • {student.department}</p>
            <p className="text-xs text-indigo-400 font-mono mt-1">ID: {student.id} • RFID: {student.rfidCardNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
            <h3 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> Face Recognition Entry
            </h3>
            <p className="text-xs text-slate-400 mb-4">Simulate face scan at campus entry gates.</p>
            <div className="flex gap-2">
              <button onClick={() => handleEntry('Face')} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                <LogIn className="w-3 h-3" /> Simulate Entry
              </button>
              <button onClick={() => handleExit('Face')} className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                <LogOut className="w-3 h-3" /> Simulate Exit
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
            <h3 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> RFID / Smart Card Entry
            </h3>
            <p className="text-xs text-slate-400 mb-4">Simulate tapping smart card at turnstiles.</p>
            <div className="flex gap-2">
              <button onClick={() => handleEntry('RFID')} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                <LogIn className="w-3 h-3" /> Tap to Enter
              </button>
              <button onClick={() => handleExit('RFID')} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                <LogOut className="w-3 h-3" /> Tap to Exit
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" /> Entry / Exit Log
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-500 uppercase">
              <tr>
                <th className="py-2">Time</th>
                <th className="py-2">Action</th>
                <th className="py-2">Method</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {entryLog.map((log, idx) => (
                <tr key={idx}>
                  <td className="py-3 font-mono">{log.time}</td>
                  <td className="py-3 font-bold">{log.type}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${log.method === 'Face' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {log.method}
                    </span>
                  </td>
                  <td className="py-3 text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Authorized</td>
                </tr>
              ))}
              {entryLog.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-slate-500">No entry/exit logs recorded today.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
