import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DarkModeContext } from './DarkModeContextValue';

// Keys used to store each role's theme preference independently
const PATIENT_KEY = 'darkMode';
const DOCTOR_KEY = 'doctorDarkMode';

// Read a saved value, falling back to system preference when unset
function loadPreference(key) {
  const saved = localStorage.getItem(key);
  if (saved !== null) return JSON.parse(saved);
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return true;
  }
  return false;
}

// Provider component
export function DarkModeProvider({ children }) {
  const location = useLocation();
  const isDoctor = location.pathname.startsWith('/doctor');
  const activeRole = isDoctor ? 'doctor' : 'patient';
  const activeKey = isDoctor ? DOCTOR_KEY : PATIENT_KEY;

  // Keep each role's preference independent in a single state object
  const [prefs, setPrefs] = useState(() => ({
    patient: loadPreference(PATIENT_KEY),
    doctor: loadPreference(DOCTOR_KEY),
  }));

  const darkMode = prefs[activeRole];

  // Persist the active role's preference and apply/remove the dark class
  useEffect(() => {
    localStorage.setItem(activeKey, JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode, activeKey]);

  // Listen for system preference changes (only when user hasn't set a preference)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      const active = isDoctor ? 'doctor' : 'patient';
      const key = isDoctor ? DOCTOR_KEY : PATIENT_KEY;
      if (localStorage.getItem(key) === null) {
        setPrefs((prev) => ({ ...prev, [active]: e.matches }));
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isDoctor]);

  const toggleDarkMode = (value) => {
    setPrefs((prev) => ({
      ...prev,
      [activeRole]: typeof value === 'boolean' ? value : !prev[activeRole],
    }));
  };

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}