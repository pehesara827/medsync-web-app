import { useState } from 'react';
import { Filter, UserPlus, MoreVertical, CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react';

// ---- Replace with GET /api/admin/doctors ----
const STATS = [
  { id: 'total', label: 'Total Doctors', value: 124, delta: '+4 this month', tone: 'up' },
  { id: 'onduty', label: 'On Duty Now', value: 82, sub: '65% capacity', tone: 'up' },
  { id: 'leave', label: 'On Leave', value: 12, sub: 'Returning next week' },
  { id: 'delay', label: 'Avg. Delay', value: '14m', delta: '-8% vs yesterday', tone: 'down-good' },
];

const STATUS_STYLES = {
  Available: 'bg-emerald-50 text-emerald-600',
  'In Surgery': 'bg-rose-50 text-rose-600',
  'On Break': 'bg-amber-50 text-amber-600',
};

const DOCTORS = [
  {
    id: 'DOC-0922',
    name: 'Dr. Sarah Jenkins',
    specialty: 'Neurology',
    schedule: '08:00 AM - 04:00 PM',
    filled: '12/16 slots filled',
    status: 'Available',
    fillPct: 75,
  },
  {
    id: 'DOC-1105',
    name: 'Dr. Michael Chen',
    specialty: 'Pediatrics',
    schedule: '10:00 AM - 06:00 PM',
    filled: 'Delayed by 15m',
    status: 'In Surgery',
    fillPct: 90,
    delayed: true,
  },
  {
    id: 'DOC-0841',
    name: 'Dr. Rachel Vance',
    specialty: 'Orthopedics',
    schedule: '09:00 AM - 05:00 PM',
    filled: '8/20 slots filled',
    status: 'On Break',
    fillPct: 40,
  },
];
// -----------------------------------------------

export default function QueueManagement() {
  const [page] = useState(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Doctor Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage hospital clinical staff, efficiency, and department coverage.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
            <Filter className="w-4 h-4" />
            Filter Dept
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800">
            <UserPlus className="w-4 h-4" />
            Add New Doctor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {STATS.map(({ id, label, value, delta, sub, tone }) => (
          <div key={id} className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
            {delta && (
              <p className={`text-xs font-medium mt-1 ${tone === 'up' || tone === 'down-good' ? 'text-emerald-600' : 'text-rose-500'}`}>
                {delta}
              </p>
            )}
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Specialty</th>
              <th className="px-6 py-3 font-medium">Today's Schedule</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {DOCTORS.map((doc) => (
              <tr key={doc.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900">{doc.name}</p>
                  <p className="text-xs text-slate-400">ID: #{doc.id}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                    {doc.specialty}
                  </span>
                </td>
                <td className="px-6 py-4 w-56">
                  <p className="text-slate-700">{doc.schedule}</p>
                  <div className="h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${doc.delayed ? 'bg-rose-400' : 'bg-cyan-500'}`}
                      style={{ width: `${doc.fillPct}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${doc.delayed ? 'text-rose-500' : 'text-slate-400'}`}>{doc.filled}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[doc.status]}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {doc.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button aria-label="Schedule" className="text-slate-400 hover:text-slate-700">
                      <CalendarClock className="w-4 h-4" />
                    </button>
                    <button aria-label="More options" className="text-slate-400 hover:text-slate-700">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">Showing 1-3 of 124 doctors</p>
          <div className="flex items-center gap-1">
            <button className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-400">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded-md bg-cyan-500 text-slate-950 text-xs font-semibold">
              {page}
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-xs text-slate-600">2</button>
            <button className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-xs text-slate-600">3</button>
            <button className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-400">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}