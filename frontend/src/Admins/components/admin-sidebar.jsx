import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ListOrdered,
  Users,
  CalendarClock,
  UserCog,
  CreditCard,
  HelpCircle,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

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
];

export default function AdminSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  const [adminName, setAdminName] = useState('');

  // Detect screen size changes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768 && onClose) {
        onClose();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onClose]);

  // Load admin name from session
  useEffect(() => {
    const loadAdminName = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        const meta = user.user_metadata || {};
        const firstName = meta.first_name || '';
        const lastName = meta.last_name || '';
        if (firstName || lastName) {
          setAdminName(`${firstName} ${lastName}`.trim());
        } else {
          setAdminName(user.email?.split('@')[0] || '');
        }
      }
    };
    loadAdminName();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
    if (onClose) onClose();
  };

  const closeSidebar = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Backdrop Overlay - Mobile Only */}
      {isOpen && (
        <button
          type="button"
          onClick={closeSidebar}
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 block md:hidden"
        />
      )}

      <aside
        aria-label="Sidebar Navigation"
        className="fixed inset-y-0 left-0 md:static z-50 md:z-auto w-64 shrink-0 bg-white dark:bg-slate-800 min-h-screen flex flex-col border-r border-slate-200 dark:border-slate-700 transform md:transform-none transition-transform duration-300 ease-in-out"
        style={
          isMobile
            ? { transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' }
            : {}
        }
      >
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-100 dark:border-slate-700">
          <div className="w-9 h-9 rounded-lg bg-[#e0f5f8] dark:bg-slate-700 flex items-center justify-center">
            <ShieldCheck className="w-4.5 h-4.5 text-[#00a8cc] dark:text-cyan-400" />
          </div>
          <div>
            <p className="text-slate-900 dark:text-slate-100 font-semibold leading-tight">
              {adminName || 'MedSync Admin'}
            </p>
            <p className="text-[10px] tracking-wide text-slate-400 dark:text-slate-400 leading-tight">
              HOSPITAL COMMAND CENTER
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, path, end, icon: Icon }) => (
            <NavLink
              key={id}
              to={path}
              end={end}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-4 ${
                  isActive
                    ? 'bg-[#e0f5f8] dark:bg-slate-700 border-[#00a8cc] text-[#00a8cc] dark:text-cyan-400'
                    : 'border-transparent text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-100 dark:border-slate-700 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
            <HelpCircle className="w-4 h-4" />
            Help Center
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}