import { Search, Bell, AlertTriangle } from 'lucide-react';

export default function AdminTopbar({ placeholder = 'Search...' }) {
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

      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition-colors">
        <AlertTriangle className="w-3.5 h-3.5" />
        Emergency Alert
      </button>

      <button
        aria-label="Notifications"
        className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100"
      >
        <Bell className="w-4.5 h-4.5" />
      </button>

      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-semibold">
        A
      </div>
    </header>
  );
}