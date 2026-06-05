import React from 'react';
import { GatePass, LeaveRequest, MaterialGatePass, Vendor } from '../types';
import { CheckCircle, XCircle, Clock, FileText, Truck, Package } from 'lucide-react';

interface HODApproverDashboardProps {
  pendingGatePasses: GatePass[];
  pendingLeaves: LeaveRequest[];
  pendingMaterialPasses: MaterialGatePass[];
  pendingVendors: Vendor[];
  onApproveGatePass: (id: string) => void;
  onRejectGatePass: (id: string) => void;
  onApproveLeave: (id: string) => void;
  onRejectLeave: (id: string) => void;
  onApproveMaterialPass: (id: string) => void;
  onRejectMaterialPass: (id: string) => void;
  onApproveVendor: (id: string) => void;
  onRejectVendor: (id: string) => void;
}

export const HODApproverDashboard: React.FC<HODApproverDashboardProps> = ({
  pendingGatePasses, pendingLeaves, pendingMaterialPasses, pendingVendors,
  onApproveGatePass, onRejectGatePass, onApproveLeave, onRejectLeave,
  onApproveMaterialPass, onRejectMaterialPass, onApproveVendor, onRejectVendor
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-indigo-400" /> HOD / Approver Dashboard</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Staff Gate Pass Approvals */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> Staff Exit Pass Approvals ({pendingGatePasses.length})</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {pendingGatePasses.map(pass => (
                <div key={pass.id} className="bg-slate-900 p-3 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold block">{pass.employeeName}</span>
                    <span className="text-slate-400">{pass.reason} • {pass.validDurationHours}h</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onApproveGatePass(pass.id)} className="p-1.5 bg-emerald-600 rounded hover:bg-emerald-500"><CheckCircle className="w-3 h-3" /></button>
                    <button onClick={() => onRejectGatePass(pass.id)} className="p-1.5 bg-rose-600 rounded hover:bg-rose-500"><XCircle className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
              {pendingGatePasses.length === 0 && <p className="text-slate-500 text-center py-4">No pending approvals.</p>}
            </div>
          </div>

          {/* Leave Approvals */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Leave Request Approvals ({pendingLeaves.length})</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {pendingLeaves.map(leave => (
                <div key={leave.id} className="bg-slate-900 p-3 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold block">{leave.employeeName}</span>
                    <span className="text-slate-400">{leave.type} • {leave.totalDays} days</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onApproveLeave(leave.id)} className="p-1.5 bg-emerald-600 rounded hover:bg-emerald-500"><CheckCircle className="w-3 h-3" /></button>
                    <button onClick={() => onRejectLeave(leave.id)} className="p-1.5 bg-rose-600 rounded hover:bg-rose-500"><XCircle className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
              {pendingLeaves.length === 0 && <p className="text-slate-500 text-center py-4">No pending approvals.</p>}
            </div>
          </div>

          {/* Material Gate Pass Approvals */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> Material Movement Approvals ({pendingMaterialPasses.length})</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {pendingMaterialPasses.map(pass => (
                <div key={pass.id} className="bg-slate-900 p-3 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold block">{pass.itemName}</span>
                    <span className="text-slate-400">{pass.direction} • Qty: {pass.quantity}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onApproveMaterialPass(pass.id)} className="p-1.5 bg-emerald-600 rounded hover:bg-emerald-500"><CheckCircle className="w-3 h-3" /></button>
                    <button onClick={() => onRejectMaterialPass(pass.id)} className="p-1.5 bg-rose-600 rounded hover:bg-rose-500"><XCircle className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
              {pendingMaterialPasses.length === 0 && <p className="text-slate-500 text-center py-4">No pending approvals.</p>}
            </div>
          </div>

          {/* Vendor Gate Pass Approvals */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2"><Truck className="w-4 h-4" /> Vendor Entry Approvals ({pendingVendors.length})</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {pendingVendors.map(vendor => (
                <div key={vendor.id} className="bg-slate-900 p-3 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold block">{vendor.companyName}</span>
                    <span className="text-slate-400">{vendor.vehicleNumber} • {vendor.purpose}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onApproveVendor(vendor.id)} className="p-1.5 bg-emerald-600 rounded hover:bg-emerald-500"><CheckCircle className="w-3 h-3" /></button>
                    <button onClick={() => onRejectVendor(vendor.id)} className="p-1.5 bg-rose-600 rounded hover:bg-rose-500"><XCircle className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
              {pendingVendors.length === 0 && <p className="text-slate-500 text-center py-4">No pending approvals.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
