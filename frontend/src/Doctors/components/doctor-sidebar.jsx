import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, CalendarClock, UserCircle, HelpCircle, LogOut, Stethoscope } from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', path: '/doctor', end: true, icon: LayoutDashboard },
  { id: 'patients', label: 'Patients', path: '/doctor/patients', icon: Users },
  { id: 'appointments', label: 'Appointments', path: '/doctor/appointments', icon: CalendarDays },
  { id: 'schedule', label: 'Schedule Manager', path: '/doctor/schedule-manager', icon: CalendarClock },
  { id: 'profile', label: 'Profile', path: '/doctor/profile', icon: UserCircle },
];

export default function DoctorSidebar() {
  return (
    <aside className="w-64 shrink-0 bg-white min-h-screen flex flex-col border-r border-slate-200">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-100">
        <div className="w-9 h-9 rounded-lg bg-cyan-50 flex items-center justify-center">
          <Stethoscope className="w-4.5 h-4.5 text-cyan-600" />
        </div>
        <div>
          <p className="text-slate-900 font-semibold leading-tight">Clinical Neon</p>
          <p className="text-[10px] tracking-wide text-slate-400 leading-tight">MEDICAL PORTAL</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ id, label, path, end, icon: Icon }) => (
          <NavLink
            key={id}
            to={path}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-4 ${
                isActive
                  ? 'bg-cyan-50 border-cyan-500 text-cyan-700'
                  : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-slate-100 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:bg-slate-50">
          <HelpCircle className="w-4 h-4" />
          Help Center
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-500 hover:bg-rose-50">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}