import { useState } from 'react';
import {
  Calendar,
  CreditCard,
  Building2,
  Download,
  Plus,
  Users,
  Clock,
  DollarSign,
  Bot,
  Sparkles,
  QrCode,
} from 'lucide-react';

// ---- Replace this block with real API calls (GET /api/admin/dashboard) ----
const STATS = [
  { id: 'appointments', label: 'Total Appointments Today', value: 142, delta: '+12% vs last week', icon: Calendar },
  { id: 'payments', label: 'Pending Payments', value: '$4,280.00', tag: 'Urgent: 4', icon: CreditCard },
  { id: 'clinics', label: 'Active Clinics', value: 18, icon: Building2 },
];

const ANALYTICS = [
  { id: 'throughput', label: 'Total Patient Throughput', value: '1,482', delta: '+12%', icon: Users, deltaTone: 'up' },
  { id: 'wait', label: 'Avg Wait Time (Real-time)', value: '18m', delta: '↑4m', sub: '+8% from last hour', icon: Clock, deltaTone: 'down' },
  { id: 'revenue', label: 'Revenue (Today)', value: '$142,840', delta: '~$4.2k', icon: DollarSign, deltaTone: 'up' },
  { id: 'medbot', label: 'MedBot AI Accuracy', value: '99.2%', sub: 'Validated by 48 senior consultants', icon: Bot },
];
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const [applying, setApplying] = useState(false);

  const handleApplyRecommendation = () => {
    setApplying(true);
    // TODO: POST /api/admin/optimizations/apply
    setTimeout(() => setApplying(false), 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Hospital Command Center</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time health operational metrics for {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50">
            <Download className="w-4 h-4" />
            Report
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#00a8cc] text-white hover:bg-[#0099bb]">
            <Plus className="w-4 h-4" />
            New Appointment
          </button>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATS.map(({ id, label, value, delta, tag, icon: Icon }) => (
          <div key={id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
              </div>
              {delta && <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{delta}</span>}
              {tag && <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{tag}</span>}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">{label}</p>
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Performance Analytics */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-slate-400 dark:text-slate-500">Showing 4 of 142 appointments</p>
        </div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Performance Analytics</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Real-time clinical throughput and operational efficiency report.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700">
              <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Today
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-[#00a8cc] text-white">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {ANALYTICS.map(({ id, label, value, delta, sub, icon: Icon, deltaTone }) => (
            <div key={id} className="border border-slate-100 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                {delta && (
                  <span className={`text-xs font-medium ${deltaTone === 'down' ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {delta}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
              {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
              <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-[#00a8cc] rounded-full" style={{ width: '65%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI insight + QR scan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#e0f5f8] dark:bg-slate-800 rounded-xl p-5 flex items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#00a8cc]/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-[#00a8cc]" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">AI Optimization Insight</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Allocating additional pediatric staff to Wing B could reduce wait times by 14% based on today's trends.
              </p>
            </div>
          </div>
          <button
            onClick={handleApplyRecommendation}
            disabled={applying}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[#00a8cc] text-white hover:bg-[#0099bb] disabled:opacity-60 flex-shrink-0"
          >
            {applying ? 'Applying…' : 'Apply Recommendation'}
          </button>
        </div>

        <div className="bg-[#e0f5f8] dark:bg-slate-800 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Active Scanning</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Point device camera at patient QR code for instant check-in verification.
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#00a8cc] text-white hover:bg-[#0099bb] flex-shrink-0">
            <QrCode className="w-4 h-4" />
            Scan Now
          </button>
        </div>
      </div>
    </div>
  );
}