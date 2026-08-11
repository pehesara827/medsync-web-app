import { useState } from 'react';
import { useDarkMode } from '../../context/useDarkMode';

// Individual setting row with a toggle switch
function SettingToggle({ label, description, enabled, onChange }) {
  return (
    <div className="flex items-start justify-between py-3 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
      <div className="flex-1 pr-3">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
      <label className="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#00a8cc]/20">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          className={`inline-block h-4 w-4 transform rounded-full shadow ring-white transition duration-200 ease-in-out ${
            enabled
              ? 'translate-x-4 bg-[#00a8cc]'
              : 'translate-x-0.5 bg-slate-300'
          }`}
        />
      </label>
    </div>
  );
}

// Setting row that navigates (e.g. to a profile page)
function SettingLink({ label, description, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
    >
      <span className="flex-shrink-0 text-slate-500 dark:text-slate-400">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
    </button>
  );
}

export default function Settings() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  
  // Local settings state
  const [settings, setSettings] = useState({
    notifications: true,
    emailAlerts: true,
    twoFactor: false,
    sessionTimeout: true,
  });

  const updateSetting = (key) => (value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleProfile = () => {
    console.log('Navigate to profile');
  };

  const handleLogout = () => {
    console.log('Navigate to logout');
  };

  return (
    <div className="w-72 max-w-[28rem] sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/80 rounded-t-2xl">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Settings</h2>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Panel Body - scrollable if content overflows */}
      <div className="max-h-96 overflow-y-auto py-2 bg-white dark:bg-slate-900">
        {/* Account Section */}
        <div className="px-3 pb-1">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
            Account
          </p>
          <SettingLink
            label="Profile"
            description="Update your personal information"
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            }
            onClick={handleProfile}
          />
        </div>

        {/* Preferences Section */}
        <div className="px-3 pb-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Preferences
          </p>
          <SettingToggle
            label="Notifications"
            description="Receive push notifications"
            enabled={settings.notifications}
            onChange={updateSetting('notifications')}
          />
          <SettingToggle
            label="Email Alerts"
            description="Email me important updates"
            enabled={settings.emailAlerts}
            onChange={updateSetting('emailAlerts')}
          />
          <SettingToggle
            label="Dark Mode"
            description="Use dark theme"
            enabled={darkMode}
            onChange={toggleDarkMode}
          />
          <SettingToggle
            label="Two-Factor Auth"
            description="Secure your account"
            enabled={settings.twoFactor}
            onChange={updateSetting('twoFactor')}
          />
          <SettingToggle
            label="Session Timeout"
            description="Auto-logout after inactivity"
            enabled={settings.sessionTimeout}
            onChange={updateSetting('sessionTimeout')}
          />
        </div>

        {/* Support Section */}
        <div className="px-3 pb-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Support
          </p>
          <SettingLink
            label="Help Center"
            description="Get help and contact support"
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            onClick={() => console.log('Help')}
          />
        </div>
      </div>

      {/* Panel Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/80 rounded-b-2xl">
        <span className="text-xs text-slate-400 dark:text-slate-400">Clinical Precision v1.0</span>
        <button
          type="button"
          onClick={() => console.log('Save settings')}
          className="px-4 py-1.5 text-xs font-medium text-white bg-[#00a8cc] rounded-full hover:bg-[#0096b8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00a8cc]/20"
        >
          Save
        </button>
      </div>
    </div>
  );
}
