// src/components/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/patient',
    end: true, // Requires exact path match so it stays active only on /patient
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    id: 'appointments',
    label: 'Appointments',
    path: '/patient/appointments', // Updated prefix
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'doctors',
    label: 'Doctors',
    path: '/patient/doctors', // Updated prefix
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/patient/analytics', // Updated prefix
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/patient/profile', // Updated prefix
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Perform authentication logout logic here...
    alert('Logging out...');
    navigate('/');
  };

  return (
    <aside 
      aria-label="Sidebar Navigation"
      className="w-72 bg-[#f8fcfd] border-r border-slate-200/60 flex flex-col justify-between h-screen p-5 select-none flex-shrink-0"
    >
      {/* Top Section */}
      <div className="flex flex-col gap-8">
        {/* Brand / Logo Header */}
        <div className="flex items-center gap-3.5 px-1 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-[#e6f7fa] border border-[#b2ebf2] flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] flex-shrink-0">
            <svg className="w-6 h-6 text-[#00b0d8]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[#00b0d8] font-bold text-lg leading-snug tracking-tight">
              Medical Portal
            </span>
            <span className="text-slate-500 text-xs font-medium">
              Clinical Precision v1.0
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Main Navigation">
          <ul className="space-y-1.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  end={item.end || false}
                  className={({ isActive }) =>
                    `relative flex items-center gap-4 px-4 py-3 rounded-xl text-sm transition-colors duration-150 ${
                      isActive
                        ? 'bg-[#e0f5f8] text-[#00b0d8] font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={isActive ? 'text-[#00b0d8]' : 'text-slate-700'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>

                      {/* Active Indicator Line */}
                      {isActive && (
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#00b0d8] rounded-l-full" />
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
      <div className="flex flex-col gap-1.5 pb-2">
        <NavLink
          to="/patient/help"
          className={({ isActive }) =>
            `group flex items-center gap-4 px-4 py-3 rounded-xl text-sm transition-colors duration-150 ${
              isActive
                ? 'bg-[#e0f5f8] text-[#00b0d8] font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
            }`
          }
        >
          <svg className="w-5 h-5 flex-shrink-0 text-slate-700 group-hover:text-slate-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Help Center</span>
        </NavLink>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-[#ff5a5f] hover:bg-red-50 font-medium text-sm transition-colors duration-150 text-left"
        >
          <svg className="w-5 h-5 flex-shrink-0 text-[#ff5a5f]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}