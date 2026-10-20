import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Sun, Moon } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useDarkMode } from '../../context/useDarkMode';
import NotificationPanel from '../../Patients/components/NotificationPanel';

// Shown when the doctor has no profile picture yet.
const FALLBACK_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256';

// Map route paths to dynamic titles
const PAGE_TITLES = {
  '/doctor': 'Dashboard',
  '/doctor/patients': 'Patients',
  '/doctor/appointments': 'Appointments',
  '/doctor/schedule-manager': 'Schedule Manager',
  '/doctor/profile': 'Profile',
  '/doctor/reset-password': 'Reset Password',
};

export default function DoctorTopbar({ onMenuClick, placeholder = 'Search patients, records...' }) {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const location = useLocation();
  const navigate = useNavigate();

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [userId, setUserId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [doctorName, setDoctorName] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState(FALLBACK_AVATAR_URL);

  const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const resolveUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user?.id) setUserId(user.id);
    };
    resolveUser();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const fetchDoctorHeader = async () => {
      try {
        const response = await fetch(`${backendUrl}/doctor/profile/${userId}`);
        if (!response.ok) return;
        const data = await response.json();
        if (data?.doctor?.fullName) setDoctorName(data.doctor.fullName);
        if (data?.doctor?.doctorImage) setProfilePicUrl(data.doctor.doctorImage);
      } catch (err) {
        console.error('Failed to fetch doctor header info:', err);
      }
    };
    fetchDoctorHeader();
  }, [userId, backendUrl, location.pathname]);

  // Get current page title dynamically from route
  const currentTitle =
    PAGE_TITLES[location.pathname] ||
    location.pathname.replace('/doctor/', '').replace('-', ' ') ||
    'Dashboard';

  // ── Unread count (poll + realtime, same as patient header) ───────────────
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/notifications/unread-count/${userId}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setUnreadCount(data.count || 0);
      } catch (err) {
        console.error('Failed to fetch unread notification count:', err);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    const channel = supabase
      .channel(`header:notifications:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, fetchUnreadCount)
      .subscribe();
    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [userId, backendUrl]);

  return (
    <header className="w-full bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700/80 px-4 md:px-8 py-2.5 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 select-none sticky top-0 z-10">
      {/* Left: Hamburger + Title */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="md:hidden p-2 -ml-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight capitalize">
            {currentTitle}
          </h1>
        </div>
      </div>

      {/* Right Controls: Search, Dark Mode, Notifications, Settings & User Avatar - Responsive */}
      <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto">
        {/* Search Bar - Full width on mobile, fixed on desktop */}
        <div className="relative flex items-center flex-1 md:flex-none">
          <Search className="w-3.5 md:w-4 h-3.5 md:h-4 text-slate-400 absolute left-3 md:left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder={placeholder}
            className="w-full md:w-64 bg-slate-100/80 dark:bg-slate-700/80 text-xs md:text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-400 pl-8 md:pl-10 pr-3 md:pr-4 py-1.5 md:py-2 rounded-full border border-transparent focus:outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-[#00a8cc]/50 focus:ring-2 focus:ring-[#00a8cc]/10 transition-all duration-150"
          />
        </div>

        {/* Dark Mode Toggle */}
        <button
          type="button"
          aria-label="Toggle dark mode"
          onClick={toggleDarkMode}
          className="p-1 md:p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
        >
          {darkMode ? <Sun className="w-4 md:w-5 h-4 md:h-5" /> : <Moon className="w-4 md:w-5 h-4 md:h-5" />}
        </button>

        {/* Notification Icon — opens the patient-style notification bar */}
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => setIsNotificationOpen(true)}
          className="relative p-1 md:p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
        >
          <Bell className="w-4 md:w-5 h-4 md:h-5" />
          {unreadCount > 0 && (
            <span
              className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-4.5 px-1 text-[10px] font-bold text-white bg-[#00b8e6] rounded-full ring-2 ring-white dark:ring-slate-800"
              aria-label={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Profile Avatar — navigates to the doctor profile page */}
        <button
          type="button"
          onClick={() => navigate('/doctor/profile')}
          aria-label="Go to profile"
          title={doctorName || 'Go to profile'}
          className="w-7 md:w-9 h-7 md:h-9 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0 hover:ring-2 hover:ring-[#00a8cc]/40 transition focus:outline-none focus:ring-2 focus:ring-[#00a8cc]/50"
        >
          <img
            src={profilePicUrl}
            alt={doctorName ? `${doctorName} profile` : 'Doctor profile'}
            className="w-full h-full object-cover"
            onError={(e) => {
              if (e.currentTarget.src !== FALLBACK_AVATAR_URL) {
                e.currentTarget.src = FALLBACK_AVATAR_URL;
              }
            }}
          />
        </button>
      </div>

      {/* Notification Slide-out Side Panel */}
      <NotificationPanel
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        userId={userId}
      />
    </header>
  );
}