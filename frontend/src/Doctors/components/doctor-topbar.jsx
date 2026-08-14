import { Search, Bell, Settings } from 'lucide-react';

// ---- Replace with the logged-in doctor's real session data ----
const DOCTOR = { name: 'Dr. S. K', specialty: 'Cardiology' };
// -----------------------------------------------------------------

export default function DoctorTopbar({ placeholder = 'Search patients, records...' }) {
  return (
    <header className="flex items-center gap-4 px-8 py-4 bg-white border-b border-slate-200">
      <div className="flex-1 relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
      </div>

      <button aria-label="Notifications" className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100">
        <Bell className="w-4.5 h-4.5" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
      </button>

      <button aria-label="Settings" className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100">
        <Settings className="w-4.5 h-4.5" />
      </button>

      <div className="w-px h-8 bg-slate-200" />

      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-semibold">
          {DOCTOR.name.split(' ').pop()}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900 leading-tight">{DOCTOR.name}</p>
          <p className="text-xs text-slate-400 leading-tight">{DOCTOR.specialty}</p>
        </div>
      </div>
    </header>
  );
}