import { useState } from 'react';
import { Search, Filter, Calendar, Plus, X, ChevronRight, Heart, Users2 } from 'lucide-react';

// ---- Replace with GET /api/admin/patients and GET /api/admin/patients/:id ----
const PATIENTS = [
  {
    id: 'MS-2024-883',
    name: 'Eleanor Murphy',
    meta: 'Female, 34 years',
    contact: '+1 (555) 012-9988',
    lastVisit: 'Oct 12, 2023',
    status: 'Active',
    bloodType: 'A Positive (A+)',
    weightHeight: '62kg / 168cm',
    history: [
      { title: 'Hypertension Management', sub: 'Dr. Vance • Last Update: Oct 12, 2023' },
      { title: 'Routine Blood Panel', sub: 'Central Lab • Aug 14, 2023' },
    ],
    beneficiaries: [
      { initials: 'LM', name: 'Lucas Murphy (Son)' },
      { initials: 'SM', name: 'Sarah Murphy (Daughter)' },
    ],
    upcoming: { title: 'Cardiology Consultation', sub: 'Follow-up check with Dr. Julian Vance', date: 'Nov 15, 2023', time: '09:30 AM', status: 'SCHEDULED' },
  },
  { id: 'MS-2024-112', name: 'Sebastian Thorne', meta: 'Male, 52 years', contact: '+1 (555) 011-3321', lastVisit: 'Sep 28, 2023', status: 'Active' },
  { id: 'MS-2024-405', name: 'Alisa Hoffman', meta: 'Female, 28 years', contact: '+1 (555) 019-4455', lastVisit: 'Aug 15, 2023', status: 'Inactive' },
  { id: 'MS-2024-009', name: 'Gloria Jenkins', meta: 'Female, 74 years', contact: '+1 (555) 012-7766', lastVisit: 'Oct 30, 2023', status: 'Active' },
];
// -------------------------------------------------------------------------

const STATUS_STYLES = {
  Active: 'bg-emerald-50 text-emerald-600',
  Inactive: 'bg-slate-100 text-slate-500',
};

function initialsOf(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('');
}

export default function PatientRecords() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Patient Records</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              placeholder="Search patients by name, ID..."
              className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 w-64 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#00a8cc] text-white hover:bg-[#0099bb]">
            <Plus className="w-4 h-4" />
            Add New Patient
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5" />
              Last Visit
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Showing 428 total patients</p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
              <th className="px-6 py-3 font-medium">Patient Name</th>
              <th className="px-6 py-3 font-medium">Patient ID</th>
              <th className="px-6 py-3 font-medium">Contact</th>
              <th className="px-6 py-3 font-medium">Last Visit</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {PATIENTS.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSelected(p)}
                className="border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/50 cursor-pointer"
              >
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#e0f5f8] dark:bg-slate-700 text-[#00a8cc] dark:text-cyan-400 text-xs font-semibold flex items-center justify-center">
                    {initialsOf(p.name)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{p.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{p.meta}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">#{p.id}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{p.contact}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{p.lastVisit}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500">Page 1 of 42</p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500">Previous</button>
            <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#00a8cc] text-white">Next</button>
          </div>
        </div>
      </div>

      {/* Slide-in detail panel */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelected(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-800 shadow-xl z-50 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700">Edit Records</button>
                <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#00a8cc] text-white">New Appointment</button>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#00a8cc] text-white font-semibold flex items-center justify-center">
                {initialsOf(selected.name)}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{selected.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">ID: #{selected.id} • {selected.meta}</p>
              </div>
            </div>

            {selected.bloodType && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-700 p-3">
                  <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1"><Heart className="w-3 h-3" /> Blood Type</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">{selected.bloodType}</p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-700 p-3">
                  <p className="text-xs text-slate-400 dark:text-slate-500">Weight / Height</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">{selected.weightHeight}</p>
                </div>
              </div>
            )}

            {selected.history && (
              <div className="mb-6">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Medical History</p>
                <div className="space-y-2">
                  {selected.history.map((h, i) => (
                    <div key={i} className={`rounded-lg p-3 border ${i === 0 ? 'border-[#00a8cc] bg-[#e0f5f8]' : 'border-slate-100 dark:border-slate-700'}`}>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{h.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{h.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.beneficiaries && (
              <div className="mb-6">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <Users2 className="w-3.5 h-3.5" /> Beneficiaries (Family)
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.beneficiaries.map((b, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-700 rounded-full pl-1 pr-3 py-1">
                      <span className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600 text-white text-[10px] flex items-center justify-center">{b.initials}</span>
                      {b.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selected.upcoming && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Upcoming Appointments</p>
                <div className="rounded-lg border border-[#00a8cc]/60 bg-[#e0f5f8] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#00a8cc]">{selected.upcoming.title}</p>
                    <span className="text-[10px] font-semibold bg-[#00a8cc] text-white px-2 py-0.5 rounded-full">{selected.upcoming.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{selected.upcoming.sub}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{selected.upcoming.date} • {selected.upcoming.time}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}