import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListOrdered,
  Users,
  CalendarClock,
  UserCog,
  CreditCard,
  Settings,
} from 'lucide-react';

// Central place for every admin nav entry. Add/remove items here only —
// the sidebar below just maps over this list.
export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/admin',
    end: true,
    icon: LayoutDashboard,
  },
  {
    id: 'queue',
    label: 'Queue Management',
    path: '/admin/queue-management',
    icon: ListOrdered,
  },
  {
    id: 'patients',
    label: 'Patient Records',
    path: '/admin/patient-records',
    icon: Users,
  },
  {
    id: 'schedule',
    label: 'Schedule/Delays',
    path: '/admin/schedule-delays',
    icon: CalendarClock,
  },
  // Your teammate is building these three — routes/components already
  // reserved so nothing breaks when they land.
  {
    id: 'staff',
    label: 'Staff Management',
    path: '/admin/staff-management',
    icon: UserCog,
  },
  {
    id: 'payments',
    label: 'Payments',
    path: '/admin/payments',
    icon: CreditCard,
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/admin/settings',
    icon: Settings,
  },
];

export default function AdminSidebar() {
  return (
    <aside className="w-64 shrink-0 bg-slate-950 text-slate-300 min-h-screen flex flex-col border-r border-slate-800">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-slate-950 font-bold">
          M
        </div>
        <div>
          <p className="text-white font-semibold leading-tight">MedSync</p>
          <p className="text-xs text-slate-500 leading-tight">Hospital Admin</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ id, label, path, end, icon: Icon }) => (
          <NavLink
            key={id}
            to={path}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}