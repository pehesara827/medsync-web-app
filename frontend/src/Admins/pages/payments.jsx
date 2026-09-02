import { useState } from 'react';
import { Search, SlidersHorizontal, Landmark, Wallet, CheckCircle2, XCircle } from 'lucide-react';

// ---- Replace with GET /api/admin/payments?status=pending ----
const PENDING = [
  {
    id: 'TXN-772910', name: 'Eleanor Rigby', patientId: 'MS-9921', department: 'Cardiology',
    type: 'Bank Transfer', amount: 120.0, note: 'Pending Approval',
    consultationFee: 100.0, serviceCharge: 20.0,
    receiptLabel: 'TRANS_RECEIPT_01.JPG', receiptTag: 'VERIFIED METADATA',
  },
  {
    id: 'TXN-772911', name: 'Marcus Vane', patientId: 'MS-8812', department: 'Orthopedics',
    type: 'Cash', amount: 85.0, note: 'Awaiting Cash',
    consultationFee: 70.0, serviceCharge: 15.0,
    receiptLabel: null, receiptTag: null,
  },
];
// -----------------------------------------------

const TYPE_ICON = { 'Bank Transfer': Landmark, Cash: Wallet };

export default function Payments() {
  const [tab, setTab] = useState('pending');
  const [selectedId, setSelectedId] = useState(PENDING[0].id);
  const selected = PENDING.find((p) => p.id === selectedId);

  const handleConfirm = () => {
    // TODO: POST /api/admin/payments/:id/confirm
  };
  const handleDecline = () => {
    // TODO: POST /api/admin/payments/:id/decline
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Payment Verification</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage pending transactions and generate patient tokens.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setTab('pending')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md ${tab === 'pending' ? 'bg-[#00a8cc] text-white' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Pending ({PENDING.length})
            </button>
            <button
              onClick={() => setTab('completed')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md ${tab === 'completed' ? 'bg-[#00a8cc] text-white' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Completed
            </button>
          </div>
          <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden h-fit">
          <div className="grid grid-cols-[1fr_110px_80px] sm:grid-cols-[1fr_140px_100px] px-6 py-3 text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
            <span>PATIENT DETAILS</span>
            <span>TYPE</span>
            <span className="text-right">AMOUNT</span>
          </div>
          {(tab === 'pending' ? PENDING : []).map((p) => {
            const Icon = TYPE_ICON[p.type];
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full grid grid-cols-[1fr_110px_80px] sm:grid-cols-[1fr_140px_100px] items-center px-6 py-4 text-left border-l-4 ${
                  selectedId === p.id ? 'border-l-[#00a8cc] bg-[#e0f5f8]' : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-700'
                } border-b border-slate-50 dark:border-slate-700 last:border-b-0`}
              >
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-600" />
                  <span>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{p.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">ID: #{p.patientId} • {p.department}</p>
                  </span>
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full px-2.5 py-1 w-fit">
                  <Icon className="w-3 h-3" /> {p.type}
                </span>
                <span className="text-right">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">${p.amount.toFixed(2)}</p>
                  <p className="text-[11px] text-amber-500">{p.note}</p>
                </span>
              </button>
            );
          })}
          {tab === 'completed' && (
            <p className="px-6 py-10 text-center text-sm text-slate-400 dark:text-slate-500">No completed transactions to show yet.</p>
          )}
        </div>

        {/* Detail panel */}
        {selected && tab === 'pending' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 h-fit">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Verification Details</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{selected.name} • Transaction #{selected.id}</p>
              </div>
              <span className="text-xs font-medium bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full">Pending Review</span>
            </div>

            <div className="rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 h-40 flex items-center justify-center relative mb-4">
              {selected.receiptLabel ? (
                <>
                  <p className="text-slate-400 dark:text-slate-500 text-xs">Receipt preview</p>
                  <span className="absolute bottom-2 left-2 text-[10px] bg-slate-900/80 text-white px-2 py-0.5 rounded">
                    {selected.receiptLabel}
                  </span>
                  <span className="absolute bottom-2 right-2 text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded">
                    {selected.receiptTag}
                  </span>
                </>
              ) : (
                <p className="text-slate-400 dark:text-slate-500 text-xs">No receipt uploaded — cash payment</p>
              )}
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Consultation Fee</span>
                <span className="text-slate-900 dark:text-slate-100">${selected.consultationFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Service Charge</span>
                <span className="text-slate-900 dark:text-slate-100">${selected.serviceCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 font-semibold">
                <span className="text-slate-900 dark:text-slate-100">Total Amount</span>
                <span className="text-slate-900 dark:text-slate-100">${selected.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDecline}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-rose-300 text-rose-600 text-sm font-medium hover:bg-rose-50"
              >
                <XCircle className="w-4 h-4" /> Decline
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#00a8cc] text-white text-sm font-medium hover:bg-[#0099bb]"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirm Payment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}