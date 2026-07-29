import { useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Settings from './Settings';

// Map route paths to your desired dynamic titles
const PAGE_TITLES = {
  
  
  '/queue': 'Queue Management',
  '/patient': 'Welcome, Uditha',
  '/patient/appointments' : 'Manage Appointments',
  '/schedule': 'Schedule Manager',
  '/staff': 'Staff Management',
  '/analytics': 'Analytics',
  '/payments': 'Payments',
  '/settings': 'Settings',
  '/help': 'Help Center',
};

export default function Header() {
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, right: 0 });

  // Close the settings panel when clicking outside of it or the settings button
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(event.target)
      ) {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  // Toggle settings panel and calculate its position relative to the settings button
  const handleSettingsClick = () => {
    if (settingsButtonRef.current) {
      const rect = settingsButtonRef.current.getBoundingClientRect();
      setPanelPosition({
        top: rect.bottom,
        right: window.innerWidth - rect.right,
      });
    }
    setIsSettingsOpen((prev) => !prev);
  };

  // Get current page title dynamically from route, or fallback to current path name
  const currentTitle =
    PAGE_TITLES[location.pathname] ||
    location.pathname.replace('/', '').replace('-', ' ') ||
    'Dashboard';

  return (
    <header className="w-full bg-white border-b border-slate-200/80 px-4 md:px-8 py-2.5 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 select-none sticky top-0 z-10">
      
      {/* Dynamic Page Title */}
      <div>
        <h1 className="text-lg md:text-2xl font-bold text-slate-800 tracking-tight capitalize">
          {currentTitle}
        </h1>
      </div>

      {/* Right Controls: Search, Notifications, Settings & User Avatar - Responsive */}
      <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto">
        
        {/* Search Bar - Full width on mobile, fixed on desktop */}
        <div className="relative flex items-center flex-1 md:flex-none">
          <svg
            className="w-3.5 md:w-4 h-3.5 md:w-4 text-slate-400 absolute left-3 md:left-3.5 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            className="w-full md:w-64 bg-slate-100/80 text-xs md:text-sm text-slate-700 placeholder-slate-400 pl-8 md:pl-10 pr-3 md:pr-4 py-1.5 md:py-2 rounded-full border border-transparent focus:outline-none focus:bg-white focus:border-[#00a8cc]/50 focus:ring-2 focus:ring-[#00a8cc]/10 transition-all duration-150"
          />
        </div>

        {/* Notification Icon with Active Indicator Dot */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-1 md:p-1.5 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors flex-shrink-0"
        >
          <svg
            className="w-4 md:w-5 h-4 md:h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {/* Active Blue Dot Badge */}
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#00a8cc] rounded-full ring-1 md:ring-2 ring-white" />
        </button>

        {/* Settings Icon - Hidden on very small screens */}
        <button
          type="button"
          aria-label="Settings"
          aria-expanded={isSettingsOpen}
          ref={settingsButtonRef}
          onClick={handleSettingsClick}
          className="p-1 md:p-1.5 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors flex-shrink-0"
        >
          <svg
            className="w-4 md:w-5 h-4 md:h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

        {/* User Profile Avatar */}
        <div className="w-7 md:w-9 h-7 md:h-9 rounded-full overflow-hidden border border-slate-200 cursor-pointer shadow-sm flex-shrink-0">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256"
            alt="User profile"
            className="w-full h-full object-cover"
          />
        </div>

      </div>

      {/* Settings Dropdown Panel - Rendered via portal outside the header to prevent height changes */}
      {isSettingsOpen &&
        createPortal(
          <div
            ref={settingsRef}
            className="fixed z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
            style={{ top: `${panelPosition.top}px`, right: `${panelPosition.right}px` }}
          >
            <Settings />
          </div>,
          document.body
        )}
    </header>
  );
}
