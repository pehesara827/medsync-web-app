// src/components/DoctorSidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/doctor',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    id: 'appointments',
    label: 'Appointments',
    path: '/appointments',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'schedule',
    label: 'Schedule Manager',
    path: '/schedule',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        <circle cx="16" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 15v1l1 1" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/profile',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function DoctorSidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    alert('Logging out...');
    navigate('/');
  };

  return (
    <aside
      aria-label="Sidebar Navigation"
      className="w-72 bg-[#f8fafb] border-r border-slate-100 flex flex-col justify-between h-screen p-5 select-none flex-shrink-0"
    >
      {/* Top Section */}
      <div className="flex flex-col gap-8">
        {/* Medical Portal Header */}
        <div className="flex items-center gap-3.5 px-1 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-[#e0f7fa]/60 ring-1 ring-[#00bce1]/30 flex items-center justify-center shadow-sm flex-shrink-0">
            <svg className="w-6 h-6 text-[#00b2d6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-4-4h8" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[#00b2d6] font-bold text-lg leading-tight">
              Medical Portal
            </span>
            <span className="text-slate-400 text-xs font-medium mt-0.5">
              Clinical Precision v1.0
            </span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav aria-label="Main Navigation">
          <ul className="space-y-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `relative flex items-center gap-4 px-4 py-3 rounded-2xl text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-[#e3f6f9] text-[#00b2d6] font-semibold'
                        : 'text-[#475569] hover:text-slate-900 hover:bg-slate-100/60 font-medium'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={isActive ? 'text-[#00b2d6]' : 'text-[#475569]'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>

                      {/* Right Active Indicator Pill */}
                      {isActive && (
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#00b2d6] rounded-l-full" />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-2 pb-2">
        {/* Help Center */}
        <NavLink
          to="/help"
          className={({ isActive }) =>
            `group flex items-center gap-4 px-4 py-3 rounded-2xl text-sm transition-all duration-150 ${
              isActive
                ? 'bg-[#e3f6f9] text-[#00b2d6] font-semibold'
                : 'text-[#475569] hover:text-slate-900 hover:bg-slate-100/60 font-medium'
            }`
          }
        >
          <svg className="w-5 h-5 flex-shrink-0 text-[#475569] group-hover:text-slate-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Help Center</span>
        </NavLink>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[#f87171] hover:bg-red-50 font-medium text-sm transition-colors duration-150 text-left"
        >
          <svg className="w-5 h-5 flex-shrink-0 text-[#f87171]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}