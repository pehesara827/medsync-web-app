import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import Logo from '../../components/Logo';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/patient',
    end: true, // Exact path match for /patient
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    id: 'doctors',
    label: 'Doctors',
    path: '/patient/doctors',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'appointments',
    label: 'Appointments',
    path: '/patient/appointments',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/patient/profile',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      navigate('/login');
      if (onClose) onClose();
    }
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

      {/* Sidebar Navigation */}
      <aside 
        aria-label="Sidebar Navigation"
        className="fixed inset-y-0 left-0 md:static z-50 md:z-auto w-72 bg-[#f8fcfd] dark:bg-slate-800 border-r border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between h-screen md:h-auto p-5 select-none flex-shrink-0 transform md:transform-none transition-transform duration-300 ease-in-out"
        style={
          isMobile
            ? { transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' }
            : {}
        }
      >
        {/* Top Section */}
        <div className="flex flex-col gap-8">
          
          {/* Brand Header — canonical MedSync mark (shared <Logo />) */}
          <div className="flex items-center gap-3.5 px-1 pt-1">
            <Logo size="lg" subtitle="Clinical Precision v1.0" />
          </div>

          {/* Navigation Links */}
          <nav aria-label="Main Navigation">
            <ul className="space-y-1.5">
              {NAV_ITEMS.map((item) => (
                <li key={item.id}>
                  <NavLink
                    to={item.path}
                    end={item.end || false}
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `relative flex items-center gap-4 px-4 py-3 rounded-xl text-sm transition-colors duration-150 ${
                        isActive
                          ? 'bg-[#e0f5f8] dark:bg-slate-700 text-[#00b0d8] dark:text-slate-100 font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-700/70 font-medium'
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
    </>
  );
}
