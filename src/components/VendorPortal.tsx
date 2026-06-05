import React, { useState } from 'react';
import { Vendor } from '../types';
import { Truck, Clock, MapPin, CheckCircle, AlertCircle } from 'lucide-react';

interface VendorPortalProps {
  vendors: Vendor[];
  onStatusChange: (id: string, status: Vendor['status']) => void;
}

export const VendorPortal: React.FC<VendorPortalProps> = ({ vendors, onStatusChange }) => {
  const [newVendor, setNewVendor] = useState({ companyName: '', contactPerson: '', vehicleNumber: '', purpose: '' });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would call an API. Here we just reset the form.
    setNewVendor({ companyName: '', contactPerson: '', vehicleNumber: '', purpose: '' });
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-indigo-400" /> Vendor Gate Pass Module</h2>
        
        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Company Name</label>
            <input type="text" value={newVendor.companyName} onChange={e => setNewVendor({...newVendor, companyName: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" placeholder="e.g. Campus Catering Co." required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Contact Person</label>
            <input type="text" value={newVendor.contactPerson} onChange={e => setNewVendor({...newVendor, contactPerson: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" placeholder="e.g. Mike Ross" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Vehicle Number</label>
            <input type="text" value={newVendor.vehicleNumber} onChange={e => setNewVendor({...newVendor, vehicleNumber: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" placeholder="e.g. CA-12-AB-3456" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Purpose & Visit Details</label>
            <input type="text" value={newVendor.purpose} onChange={e => setNewVendor({...newVendor, purpose: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" placeholder="e.g. Daily Food Supply Delivery" required />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold">Register Vendor & Generate Pass</button>
          </div>
        </form>

        <h3 className="text-lg font-bold mb-4">Active Vendor Logs & Status</h3>
        <div className="grid grid-cols-1 gap-3">
          {vendors.map(vendor => (
            <div key={vendor.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Truck className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-bold text-sm">{vendor.companyName}</h4>
                  <p className="text-xs text-slate-400">Contact: {vendor.contactPerson} • {vendor.phone}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {vendor.vehicleNumber}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {vendor.entryTime || 'Pending Entry'}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 italic">"{vendor.purpose}"</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                  vendor.status === 'On-Site' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  vendor.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-slate-500/10 text-slate-400 border border-slate-800'
                }`}>
                  {vendor.status}
                </span>
                {vendor.status === 'Pending' && (
                  <button onClick={() => onStatusChange(vendor.id, 'Approved')} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-[10px] font-bold">Approve</button>
                )}
                {vendor.status === 'Approved' && (
                  <button onClick={() => onStatusChange(vendor.id, 'On-Site')} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-[10px] font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Check-In</button>
                )}
                {vendor.status === 'On-Site' && (
                  <button onClick={() => onStatusChange(vendor.id, 'Exited')} className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-[10px] font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Check-Out</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
