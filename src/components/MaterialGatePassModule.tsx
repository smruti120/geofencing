import React, { useState } from 'react';
import { MaterialGatePass } from '../types';
import { Package, ArrowUpRight, ArrowDownLeft, CheckCircle, Clock, Barcode } from 'lucide-react';

interface MaterialGatePassModuleProps {
  materialPasses: MaterialGatePass[];
  onApprove: (id: string) => void;
}

export const MaterialGatePassModule: React.FC<MaterialGatePassModuleProps> = ({ materialPasses, onApprove }) => {
  const [newPass, setNewPass] = useState({ itemName: '', quantity: 1, department: 'Computer Science', direction: 'Outward' as 'Inward' | 'Outward' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewPass({ itemName: '', quantity: 1, department: 'Computer Science', direction: 'Outward' });
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-indigo-400" /> Material Gate Pass Module</h2>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-400 mb-1">Material / Item Details</label>
            <input type="text" value={newPass.itemName} onChange={e => setNewPass({...newPass, itemName: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" placeholder="e.g. 5x Dell Monitors" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Quantity & Dept.</label>
            <div className="flex gap-2">
              <input type="number" value={newPass.quantity} onChange={e => setNewPass({...newPass, quantity: parseInt(e.target.value)})} className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" min="1" required />
              <select value={newPass.department} onChange={e => setNewPass({...newPass, department: e.target.value})} className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white">
                <option value="Computer Science">CS</option>
                <option value="Bio-Engineering">Bio-Eng</option>
                <option value="Administration">Admin</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Direction</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setNewPass({...newPass, direction: 'Inward'})} className={`flex-1 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 ${newPass.direction === 'Inward' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}><ArrowDownLeft className="w-3 h-3" /> Inward</button>
              <button type="button" onClick={() => setNewPass({...newPass, direction: 'Outward'})} className={`flex-1 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 ${newPass.direction === 'Outward' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}><ArrowUpRight className="w-3 h-3" /> Outward</button>
            </div>
          </div>
          <div className="md:col-span-4">
            <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold">Request Material Movement</button>
          </div>
        </form>

        <h3 className="text-lg font-bold mb-4">Approval Workflow & Logs</h3>
        <div className="grid grid-cols-1 gap-3">
          {materialPasses.map(pass => (
            <div key={pass.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Barcode className="w-5 h-5" /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm">{pass.itemName}</h4>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${pass.direction === 'Inward' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{pass.direction}</span>
                  </div>
                  <p className="text-xs text-slate-400">Qty: {pass.quantity} • Dept: {pass.department} • Requested by: {pass.requestedBy}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {pass.requestTime}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                  pass.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  pass.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-slate-500/10 text-slate-400 border border-slate-800'
                }`}>
                  {pass.status}
                </span>
                {pass.status === 'Pending' && (
                  <button onClick={() => onApprove(pass.id)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-[10px] font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approve</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
